import express from 'express';
import {
  getAllUsersForAdmin,
  getVerifiedEmailRecipientsForAdmin,
  getUserByEmail
} from '../services/supabaseService.js';
import { sendWeatherEmail, getEmailProviderStatus } from '../services/emailService.js';
import { getIndiaAlerts } from '../services/alertService.js';

const router = express.Router();

/**
 * Middleware to check Administrator authorization.
 * Verifies user role directly against Supabase public.users — never trusts
 * the frontend role header alone.
 */
async function requireAdminAuth(req, res, next) {
  const userRole = (req.headers['x-user-role'] || '').toString().trim().toLowerCase();
  const userEmail = (req.headers['x-user-email'] || '').toString().trim().toLowerCase();

  console.log(`[Admin] Authorization check (role: "${userRole || 'N/A'}", email: "${userEmail || 'N/A'}")`);

  let isAuthorized = false;

  if (userEmail) {
    try {
      const dbUser = await getUserByEmail(userEmail);
      if (dbUser && dbUser.role === 'admin') {
        isAuthorized = true;
      }
    } catch (err) {
      console.error('[Admin] Error checking user role in database:', err.message);
    }
  }

  if (!isAuthorized) {
    console.warn(`[Admin] Unauthorized access attempt by email "${userEmail || 'N/A'}" with role "${userRole || 'N/A'}"`);
    return res.status(403).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Administrator access required.'
    });
  }

  console.log('[Admin] Authorization successful');
  next();
}

/**
 * GET /api/admin/users
 * Retrieves registered users from Supabase public.users for the Admin Portal.
 */
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    console.log('[Admin] GET /api/admin/users — fetching users from Supabase');
    const users = await getAllUsersForAdmin();
    console.log(`[Admin] Users fetched: ${users.length}`);
    return res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error('[Admin] Failed to fetch users:', err.message);
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Unable to load users.'
    });
  }
});

/**
 * GET /api/admin/email/status
 * Diagnostic endpoint reporting Resend email provider status without revealing secret keys.
 */
router.get('/email/status', requireAdminAuth, async (req, res) => {
  try {
    const status = getEmailProviderStatus();
    return res.json({
      success: true,
      ...status
    });
  } catch (err) {
    console.error('[Admin] Failed to fetch email provider status:', err.message);
    return res.status(500).json({
      success: false,
      error: 'STATUS_CHECK_FAILED',
      message: 'Unable to check email provider status.'
    });
  }
});

/**
 * POST /api/admin/email/preview
 * Generates an email preview for selected recipients.
 * Does NOT send any email.
 */
router.post('/email/preview', requireAdminAuth, async (req, res) => {
  try {
    const { userEmails, userIds, subject, message, includeDashboardLink } = req.body;

    const emailIdentifiers = userEmails || userIds || [];

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Message content cannot be empty.'
      });
    }

    const recipients = await getVerifiedEmailRecipientsForAdmin(emailIdentifiers);

    const fromEmail = (process.env.WEATHERGPT_EMAIL_FROM || 'onboarding@resend.dev').trim();
    const dashboardUrl = process.env.WEATHERGPT_PUBLIC_URL || 'http://localhost:5173/home';

    const compiledMessage = includeDashboardLink
      ? `${message.trim()}\n\nCheck live WeatherGPT updates:\n${dashboardUrl}`
      : message.trim();

    return res.json({
      success: true,
      preview: {
        from: `WeatherGPT <${fromEmail}>`,
        to: recipients.map((r) => r.email),
        recipientCount: recipients.length,
        recipients: recipients.map((r) => ({ name: r.name || 'User', email: r.email, role: r.role })),
        subject: (subject || '').trim() || 'WeatherGPT Weather Update',
        compiledMessage,
        dashboardUrlAppended: Boolean(includeDashboardLink)
      }
    });
  } catch (err) {
    console.error('[Admin] Failed to generate email preview:', err.message);
    return res.status(500).json({
      success: false,
      error: 'PREVIEW_GENERATION_FAILED',
      message: 'Unable to generate email preview.'
    });
  }
});

/**
 * POST /api/admin/email/send
 * Validates selected recipients from Supabase and dispatches email notifications via Resend.
 */
router.post('/email/send', requireAdminAuth, async (req, res) => {
  try {
    const { userEmails, userIds, subject, message, includeDashboardLink } = req.body;

    const emailIdentifiers = userEmails || userIds || [];

    if (!emailIdentifiers || !Array.isArray(emailIdentifiers) || emailIdentifiers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_RECIPIENTS_SELECTED',
        message: 'At least one eligible recipient must be selected.'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_MESSAGE',
        message: 'Email message body cannot be empty.'
      });
    }

    // Server-side verification of selected users against Supabase public.users
    const verifiedRecipients = await getVerifiedEmailRecipientsForAdmin(emailIdentifiers);

    if (verifiedRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_ELIGIBLE_RECIPIENTS',
        message: 'None of the selected users have a valid email address.'
      });
    }

    const dashboardUrl = process.env.WEATHERGPT_PUBLIC_URL || 'http://localhost:5173/home';

    const emailResult = await sendWeatherEmail({
      recipients: verifiedRecipients,
      subject: (subject || '').trim() || 'WeatherGPT Weather Update',
      message: message.trim(),
      includeDashboardLink: Boolean(includeDashboardLink),
      dashboardUrl
    });

    if (emailResult.error === 'EMAIL_PROVIDER_NOT_CONFIGURED') {
      return res.status(400).json(emailResult);
    }

    const statusCode = emailResult.success ? 200 : 400;
    return res.status(statusCode).json(emailResult);
  } catch (err) {
    console.error('[Admin] Failed to process email send request:', err.message);
    return res.status(500).json({
      success: false,
      error: 'EMAIL_DISPATCH_FAILED',
      message: 'Unable to process email send request.'
    });
  }
});

/**
 * GET /api/admin/alerts/india
 * Returns active India weather alerts from the configured official alert provider.
 * NEVER fabricates alert data. Returns structured unavailability notice if no provider configured.
 */
router.get('/alerts/india', requireAdminAuth, async (req, res) => {
  try {
    console.log('[Admin] GET /api/admin/alerts/india');
    const result = await getIndiaAlerts();
    return res.json(result);
  } catch (err) {
    console.error('[Admin] Failed to fetch India alerts:', err.message);
    return res.status(500).json({
      available: false,
      providerConfigured: false,
      reason: 'Alert service encountered an unexpected error.',
      alerts: [],
      fetchedAt: new Date().toISOString(),
      provider: 'error'
    });
  }
});

export default router;
