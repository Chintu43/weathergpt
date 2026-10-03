import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getUserByEmail, updateUserPassword } from './supabaseService.js';

// In-memory store for active reset tokens: tokenHash -> { email, expiresAt, used, usedAt }
const resetTokenStore = new Map();

/**
 * Generates a secure, single-use, 30-minute reset token for an email address.
 * Uses SHA-256 token hashing so plaintext tokens are never stored.
 * Always returns a generic safe message to prevent account enumeration.
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  
  if (!normalizedEmail) {
    return {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    };
  }

  let dbUser = null;
  try {
    dbUser = await getUserByEmail(normalizedEmail);
  } catch (err) {
    console.warn('[PasswordReset] Database lookup warning:', err.message);
  }

  if (dbUser) {
    // Generate 32-byte secure random hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    resetTokenStore.set(tokenHash, {
      email: normalizedEmail,
      expiresAt,
      used: false
    });

    // Strip any path suffix from the public URL (e.g., /home) so the reset link is always at the root
    const rawPublicUrl = process.env.WEATHERGPT_PUBLIC_URL || 'http://localhost:5173';
    let origin;
    try {
      origin = new URL(rawPublicUrl).origin;
    } catch {
      origin = 'http://localhost:5173';
    }
    const resetUrl = `${origin}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    console.log(`==================================================`);
    console.log(`  [PasswordReset] Password Reset Requested for: ${normalizedEmail}`);
    console.log(`  [PasswordReset] Reset Link: ${resetUrl}`);
    console.log(`  [PasswordReset] Note: Link expires in 30 minutes.`);
    console.log(`==================================================`);
  } else {
    console.log(`[PasswordReset] Request for unregistered email: ${normalizedEmail} (suppressed for security)`);
  }

  return {
    success: true,
    message: 'If an account exists for this email, a password reset link has been sent.'
  };
}

/**
 * Validates whether a reset token is valid, unexpired, and unused.
 */
export function validateResetToken(rawToken, email) {
  if (!rawToken || !email) {
    return { valid: false, message: 'Invalid or missing reset token parameters.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = resetTokenStore.get(tokenHash);
  if (!record) {
    return { valid: false, message: 'Reset link is invalid or has expired.' };
  }

  if (record.email !== normalizedEmail) {
    return { valid: false, message: 'Reset link is invalid or has expired.' };
  }

  if (record.used) {
    return { valid: false, message: 'This reset link has already been used.' };
  }

  if (Date.now() > record.expiresAt) {
    return { valid: false, message: 'Reset link has expired. Please request a new reset link.' };
  }

  return { valid: true, email: record.email };
}

/**
 * Resets user password using a valid reset token.
 */
export async function executePasswordReset({ rawToken, email, password, confirmPassword }) {
  if (!password || password.length < 6) {
    const err = new Error('Password must be at least 6 characters long.');
    err.status = 400;
    throw err;
  }

  if (password !== confirmPassword) {
    const err = new Error('Passwords do not match.');
    err.status = 400;
    throw err;
  }

  const validation = validateResetToken(rawToken, email);
  if (!validation.valid) {
    const err = new Error(validation.message);
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = resetTokenStore.get(tokenHash);

  // Hash new password using bcrypt
  const passwordHash = await bcrypt.hash(password, 10);

  // Update password in Supabase public.users table while preserving existing profile & role
  const updatedUser = await updateUserPassword(normalizedEmail, passwordHash);

  // Mark token as used
  record.used = true;
  record.usedAt = Date.now();

  console.log(`[PasswordReset] Password updated for ${normalizedEmail}. Preserved role: ${updatedUser?.role || 'N/A'}`);

  return {
    success: true,
    message: 'Password updated successfully. Please log in with your new password.'
  };
}
