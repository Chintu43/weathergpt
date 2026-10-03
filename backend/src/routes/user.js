import express from 'express';
import bcrypt from 'bcryptjs';
import { saveOrUpdateUser, getUserByEmail, updateUserPassword } from '../services/supabaseService.js';
import { requestPasswordReset, validateResetToken, executePasswordReset } from '../services/passwordResetService.js';

const router = express.Router();

/**
 * POST /api/user/sync
 * Connects login/registration flow to Supabase public.users table.
 * Saves/updates user info with phone_number.
 */
router.post('/sync', async (req, res) => {
  try {
    const { name, email, phone_number, city, district, state, country, latitude, longitude, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email address is required.'
      });
    }

    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Phone number is required.'
      });
    }

    // Basic phone number validation
    const cleanedPhone = phone_number.trim();
    const digitsOnly = cleanedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PHONE_NUMBER',
        message: 'Please enter a valid phone number.'
      });
    }

    const { user, isNew } = await saveOrUpdateUser({
      name,
      email,
      phone_number: cleanedPhone,
      city,
      district,
      state,
      country,
      latitude,
      longitude,
      role
    });

    const statusCode = isNew ? 201 : 200;
    return res.status(statusCode).json({
      success: true,
      message: isNew ? 'User created successfully.' : 'User information updated successfully.',
      user
    });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({
        success: false,
        error: err.code || 'PHONE_ALREADY_EXISTS',
        message: err.message || 'This phone number is already registered with another account.'
      });
    }
    if (err.status === 400) {
      return res.status(400).json({
        success: false,
        error: err.code || 'INVALID_INPUT',
        message: err.message
      });
    }

    console.error('[UserRoute] Failed to save user information:', err.message);
    return res.status(500).json({
      success: false,
      error: 'DATABASE_SAVE_FAILED',
      message: err.message || 'Unable to save user information. Please try again.'
    });
  }
});

/**
 * POST /api/user/admin-login
 * Dedicated Administrator Login verification route.
 * Verifies credentials and checks database role === 'admin'.
 * 
 * SECURITY RULES:
 * - NO hardcoded admin emails or passwords!
 * - NO trusting frontend role!
 * - Verification comes directly from database query (users.role === 'admin').
 */
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password, phone_number } = req.body;

    if (!email || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Retrieve corresponding user record from Supabase public.users
    let dbUser;
    try {
      dbUser = await getUserByEmail(normalizedEmail);
    } catch (dbErr) {
      console.error('[UserRoute] Supabase fetch error during admin login:', dbErr.message);
      return res.status(500).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Unable to verify administrator access. Please try again.'
      });
    }

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid login credentials.'
      });
    }

    // 2. Database Role Verification: Check role === "admin"
    if (dbUser.role !== 'admin') {
      console.warn(`[UserRoute] Non-admin user "${normalizedEmail}" (role: "${dbUser.role}") attempted admin login.`);
      return res.status(403).json({
        success: false,
        error: 'ADMIN_ACCESS_REQUIRED',
        message: 'You do not have administrator access.'
      });
    }

    // 3. Admin Password Verification using secure bcrypt hash
    const adminEnvEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminEnvHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
    let isPasswordValid = false;

    if (adminEnvEmail && normalizedEmail === adminEnvEmail && adminEnvHash) {
      isPasswordValid = await bcrypt.compare(password, adminEnvHash);
    } else if (dbUser.password) {
      isPasswordValid = await bcrypt.compare(password, dbUser.password);
    }

    if (!isPasswordValid) {
      console.warn(`[UserRoute] Invalid admin password attempt for "${normalizedEmail}".`);
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid login credentials.'
      });
    }

    // If authenticated using legacy passwordStore hash, migrate it to Supabase
    if (isPasswordValid && dbUser.password && !dbUser.password_hash) {
      try {
        await updateUserPassword(normalizedEmail, dbUser.password);
        console.log(`[UserRoute] Migrated legacy admin password hash to Supabase for ${normalizedEmail}`);
      } catch (migErr) {
        console.warn('[UserRoute] Admin legacy password migration notice:', migErr.message);
      }
    }

    // 3. Update phone number if provided
    if (phone_number && phone_number.trim()) {
      try {
        await saveOrUpdateUser({
          name: dbUser.name,
          email: normalizedEmail,
          phone_number: phone_number.trim(),
          role: 'admin'
        });
      } catch (err) {
        console.warn('[UserRoute] Phone update warning during admin login:', err.message);
      }
    }

    return res.json({
      success: true,
      message: 'Administrator authenticated successfully.',
      user: {
        name: dbUser.name || 'Administrator',
        email: dbUser.email,
        phone_number: phone_number || dbUser.phone_number,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('[UserRoute] Admin login error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Unable to verify administrator access. Please try again.'
    });
  }
});

/**
 * POST /api/user/forgot-password
 * Initiates password reset flow.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset(email);
    return res.json(result);
  } catch (err) {
    console.error('[UserRoute] Error requesting password reset:', err.message);
    return res.json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    });
  }
});

/**
 * GET /api/user/reset-password/validate
 * Validates a reset token and email pair.
 */
router.get('/reset-password/validate', (req, res) => {
  try {
    const { token, email } = req.query;
    const result = validateResetToken(token, email);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('[UserRoute] Error validating reset token:', err.message);
    return res.status(400).json({ valid: false, message: 'Reset link is invalid or has expired.' });
  }
});

/**
 * POST /api/user/reset-password
 * Completes password reset using token and new password.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, password, confirmPassword } = req.body;
    const result = await executePasswordReset({ rawToken: token, email, password, confirmPassword });
    return res.json(result);
  } catch (err) {
    console.error('[UserRoute] Error executing password reset:', err.message);
    const status = err.status || 400;
    return res.status(status).json({
      success: false,
      error: 'RESET_FAILED',
      message: err.message || 'Unable to reset password. Please try again.'
    });
  }
});

/**
 * POST /api/user/login
 * Validates login credentials against Supabase / hashed password.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const dbUser = await getUserByEmail(normalizedEmail);

    if (!dbUser || !dbUser.password) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      });
    }

    // If authenticated using legacy passwordStore hash (password_hash is NULL in Supabase), migrate it to Supabase
    if (!dbUser.password_hash && dbUser.password) {
      try {
        await updateUserPassword(normalizedEmail, dbUser.password);
        console.log(`[UserRoute] Migrated legacy password hash to Supabase for ${normalizedEmail}`);
      } catch (migErr) {
        console.warn('[UserRoute] Legacy password hash migration notice:', migErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Authentication successful.',
      user: {
        name: dbUser.name,
        email: dbUser.email,
        phone_number: dbUser.phone_number,
        role: dbUser.role
      }
    });
  } catch (err) {
    console.error('[UserRoute] Login error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'AUTHENTICATION_FAILED',
      message: 'Unable to authenticate. Please try again.'
    });
  }
});

export default router;
