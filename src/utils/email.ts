import nodemailer from 'nodemailer';

const APP_NAME = process.env.APP_NAME || 'Dubai Estates';
const EMAIL_FROM = process.env.EMAIL_FROM || `"${APP_NAME}" <noreply@dubaiestates.com>`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

/** Check if email is configured. */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface QueryConfirmationData {
  recipientName: string;
  recipientEmail: string;
  message: string;
  source: 'contact_page' | 'lead_form' | 'other';
  interestedProperty?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getQueryConfirmationHtml(data: QueryConfirmationData): string {
  const { recipientName, message, source, interestedProperty } = data;
  const safeMessage = escapeHtml(message);
  const safeName = escapeHtml(recipientName);
  const safeProperty = interestedProperty ? escapeHtml(interestedProperty) : '';
  const isLeadForm = source === 'lead_form';
  const primaryColor = '#0d9488';
  const primaryLight = '#14b8a6';
  const bgColor = '#f8fafc';
  const textColor = '#1e293b';
  const textMuted = '#64748b';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for contacting ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${bgColor}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${bgColor};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                ${APP_NAME}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Premier Real Estate in Dubai
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 24px 0; color: ${textColor}; font-size: 22px; font-weight: 600;">
                Thank You, ${safeName}
              </h2>
              <p style="margin: 0 0 20px 0; color: ${textColor}; font-size: 16px; line-height: 1.6;">
                We have received your ${isLeadForm ? 'property enquiry' : 'message'} and appreciate you reaching out to us.
              </p>
              <p style="margin: 0 0 24px 0; color: ${textMuted}; font-size: 15px; line-height: 1.6;">
                Our team will review your request and get back to you within 24–48 hours. We prioritize every inquiry and look forward to assisting you with your real estate needs.
              </p>
              <!-- Summary Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${bgColor}; border-radius: 12px; margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; color: ${textMuted}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Your ${isLeadForm ? 'Enquiry' : 'Message'} Summary</p>
                    ${safeProperty ? `
                    <p style="margin: 0 0 8px 0; color: ${textColor}; font-size: 15px;"><strong>Property:</strong> ${safeProperty}</p>
                    ` : ''}
                    <p style="margin: 0; color: ${textColor}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; color: ${textMuted}; font-size: 14px; line-height: 1.6;">
                If you have any urgent questions, feel free to call us directly or reply to this email.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${FRONTEND_URL}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">
                Visit Our Website
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: ${bgColor}; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: ${textMuted}; font-size: 12px; text-align: center; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: ${textMuted}; font-size: 12px; text-align: center;">
                Dubai, United Arab Emirates
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function getQueryConfirmationText(data: QueryConfirmationData): string {
  const { recipientName, message, source, interestedProperty } = data;
  const isLeadForm = source === 'lead_form';
  return `
Thank You, ${recipientName}

We have received your ${isLeadForm ? 'property enquiry' : 'message'} and appreciate you reaching out to us.

Our team will review your request and get back to you within 24–48 hours.

Your ${isLeadForm ? 'Enquiry' : 'Message'} Summary:
${interestedProperty ? `Property: ${interestedProperty}\n` : ''}
${message}

If you have any urgent questions, feel free to call us or reply to this email.

Best regards,
${APP_NAME}
  `.trim();
}

/**
 * Send confirmation email to customer when they submit a query.
 * Fires and forgets – does not block the API response.
 */
export async function sendQueryConfirmationEmail(data: QueryConfirmationData): Promise<void> {
  if (!isEmailConfigured()) {
    return;
  }
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: data.recipientEmail,
      subject: `We've received your ${data.source === 'lead_form' ? 'property enquiry' : 'message'} – ${APP_NAME}`,
      text: getQueryConfirmationText(data),
      html: getQueryConfirmationHtml(data),
    });
  } catch (err) {
    console.error('[Email] Failed to send query confirmation:', err);
  }
}
