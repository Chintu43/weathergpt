import axios from 'axios';

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Health & diagnostic status for Resend email provider configuration.
 * Safe to report without revealing secrets.
 */
export function getEmailProviderStatus() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = (process.env.WEATHERGPT_EMAIL_FROM || 'onboarding@resend.dev').trim();

  return {
    provider: 'resend',
    configured: Boolean(apiKey && apiKey.length > 5),
    apiKeyConfigured: Boolean(apiKey && apiKey.length > 5),
    fromConfigured: Boolean(fromEmail),
    from: fromEmail
  };
}

/**
 * Builds HTML and text versions of the Weather Email.
 */
function compileEmailBody(message, dashboardUrl, includeDashboardLink) {
  const safeMessage = (message || '').trim();
  const paragraphs = safeMessage.split('\n\n').map(p => p.trim()).filter(Boolean);

  const formattedHtmlParagraphs = paragraphs
    .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const dashboardBlockHtml = includeDashboardLink && dashboardUrl
    ? `
      <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">Check live WeatherGPT updates:</p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Live Dashboard</a>
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>WeatherGPT Notification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; margin: 0;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 20px 24px; text-align: left;">
            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">WeatherGPT</h1>
            <p style="margin: 4px 0 0 0; color: #bae6fd; font-size: 12px; font-weight: 500;">AI-Powered Weather Intelligence & Alerts</p>
          </div>
          <div style="padding: 24px;">
            ${formattedHtmlParagraphs}
            ${dashboardBlockHtml}
          </div>
          <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">You are receiving this weather intelligence notification from WeatherGPT.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  let text = safeMessage;
  if (includeDashboardLink && dashboardUrl) {
    text += `\n\nCheck live WeatherGPT updates:\n${dashboardUrl}`;
  }

  return { html, text };
}

/**
 * Sends Weather Email notifications via Resend API.
 * 
 * Specs:
 * POST https://api.resend.com/emails
 * Headers: Authorization: Bearer <RESEND_API_KEY>
 * Body: { from, to, subject, html, text }
 */
export async function sendWeatherEmail({
  recipients = [],
  subject = 'WeatherGPT Weather Update',
  message = '',
  includeDashboardLink = true,
  dashboardUrl = 'http://localhost:5173/home'
}) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = (process.env.WEATHERGPT_EMAIL_FROM || 'onboarding@resend.dev').trim();
  const fromFormatted = `WeatherGPT <${fromEmail}>`;

  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      error: 'NO_RECIPIENTS_SELECTED',
      message: 'At least one eligible recipient must be selected.',
      sentCount: 0,
      failedCount: 0,
      results: []
    };
  }

  if (!apiKey || apiKey.length < 5) {
    console.warn('[EmailService] Dispatch aborted: RESEND_API_KEY is not configured.');
    return {
      success: false,
      error: 'EMAIL_PROVIDER_NOT_CONFIGURED',
      message: 'Resend API key is not configured. Please set RESEND_API_KEY in the backend environment.',
      sentCount: 0,
      failedCount: recipients.length,
      results: recipients.map((r) => ({
        email: r.email,
        name: r.name || 'User',
        success: false,
        error: 'EMAIL_PROVIDER_NOT_CONFIGURED: Resend API key is not configured.'
      }))
    };
  }

  const { html, text } = compileEmailBody(message, dashboardUrl, includeDashboardLink);

  console.log(`[EmailService] Dispatching emails via Resend to ${recipients.length} recipients...`);

  const results = [];
  let sentCount = 0;
  let failedCount = 0;
  let lastProviderError = null;

  for (const recipient of recipients) {
    try {
      const payload = {
        from: fromFormatted,
        to: recipient.email,
        subject: subject.trim() || 'WeatherGPT Weather Update',
        html,
        text
      };

      const response = await axios.post(RESEND_API_URL, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 12000
      });

      const resData = response.data || {};
      const messageId = resData.id || `msg_${Date.now()}`;

      results.push({
        email: recipient.email,
        name: recipient.name || 'User',
        success: true,
        messageId,
        error: null
      });
      sentCount += 1;
      console.log(`[EmailService] Resend delivered to ${recipient.email} (id: ${messageId})`);
    } catch (apiErr) {
      failedCount += 1;
      const status = apiErr.response?.status;
      const errBody = apiErr.response?.data || {};
      const errMsg = errBody.message || apiErr.message || 'Failed to dispatch email via Resend.';

      lastProviderError = {
        status,
        code: errBody.name || (status === 401 ? 'RESEND_AUTH_ERROR' : 'RESEND_DISPATCH_ERROR'),
        message: errMsg
      };

      console.error(`[EmailService] Resend error for recipient ${recipient.email}:`, errMsg);

      results.push({
        email: recipient.email,
        name: recipient.name || 'User',
        success: false,
        messageId: null,
        error: errMsg
      });
    }
  }

  const overallSuccess = sentCount > 0;

  return {
    success: overallSuccess,
    provider: 'resend',
    sentCount,
    failedCount,
    totalCount: recipients.length,
    results,
    error: overallSuccess ? undefined : (lastProviderError?.code || 'EMAIL_DISPATCH_FAILED'),
    message: overallSuccess
      ? `${sentCount} of ${recipients.length} emails dispatched successfully via Resend.`
      : (lastProviderError?.message || 'Resend failed to dispatch emails.')
  };
}
