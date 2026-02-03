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

/** Data for follow-up reminder email to assigned user. */
export interface FollowUpReminderData {
  assigneeEmail: string;
  assigneeName: string;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  propertyName?: string;
  followUpTitle: string;
  followUpDueAt: Date;
  leadId: string;
}

function getFollowUpReminderHtml(data: FollowUpReminderData): string {
  const dueStr = data.followUpDueAt.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const primaryColor = '#0d9488';
  const primaryLight = '#14b8a6';
  const bgColor = '#f8fafc';
  const textColor = '#1e293b';
  const textMuted = '#64748b';
  const leadUrl = `${FRONTEND_URL}/admin/leads/${data.leadId}`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Follow-up reminder – ${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${bgColor};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${bgColor};">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%); padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Follow-up Reminder</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${APP_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 16px 0; color: ${textColor}; font-size: 16px;">Hi ${data.assigneeName},</p>
              <p style="margin: 0 0 20px 0; color: ${textColor}; font-size: 16px;">You have a scheduled follow-up:</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${bgColor}; border-radius: 12px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; color: ${textMuted}; font-size: 12px; font-weight: 600;">Task</p>
                    <p style="margin: 0 0 12px 0; color: ${textColor}; font-size: 15px;">${data.followUpTitle}</p>
                    <p style="margin: 0 0 8px 0; color: ${textMuted}; font-size: 12px; font-weight: 600;">Due</p>
                    <p style="margin: 0 0 12px 0; color: ${textColor}; font-size: 15px;">${dueStr}</p>
                    <p style="margin: 0 0 8px 0; color: ${textMuted}; font-size: 12px; font-weight: 600;">Lead</p>
                    <p style="margin: 0 0 4px 0; color: ${textColor}; font-size: 15px;">${data.leadName}</p>
                    <p style="margin: 0 0 4px 0; color: ${textColor}; font-size: 14px;">${data.leadEmail} · ${data.leadPhone}</p>
                    ${data.propertyName ? `<p style="margin: 8px 0 0 0; color: ${textMuted}; font-size: 14px;">Property: ${data.propertyName}</p>` : ''}
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; text-align: center;">
                <a href="${leadUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px;">View Lead</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: ${bgColor}; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: ${textMuted}; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${APP_NAME}</p>
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

/**
 * Send follow-up reminder email to assigned user. Fires and forgets.
 */
export async function sendFollowUpReminderEmail(data: FollowUpReminderData): Promise<void> {
  if (!isEmailConfigured()) return;
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: data.assigneeEmail,
      subject: `Follow-up due: ${data.followUpTitle} – ${APP_NAME}`,
      html: getFollowUpReminderHtml(data),
    });
  } catch (err) {
    console.error('[Email] Failed to send follow-up reminder:', err);
  }
}

// ——— Admin alerts ———

export interface NewLeadAlertData {
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  propertyName?: string;
  message: string;
  leadId: string;
  queryId?: string;
}

export interface NewEnquiryAlertData {
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  interestedProperty?: string;
  queryId: string;
}

export interface FollowUpDueAlertData {
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  propertyName?: string;
  followUpTitle: string;
  followUpDueAt: Date;
  followUpType?: string;
  leadId: string;
  followUpId?: string;
}

function getNewLeadAlertHtml(data: NewLeadAlertData): string {
  const leadUrl = `${FRONTEND_URL}/admin/leads/${data.leadId}`;
  const primaryColor = '#0d9488';
  const primaryLight = '#14b8a6';
  const bgColor = '#f8fafc';
  const textColor = '#1e293b';
  const textMuted = '#64748b';
  return `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Lead – ${APP_NAME}</title></head>
<body style="margin:0;font-family:'Segoe UI',sans-serif;background:${bgColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,${primaryColor},${primaryLight});padding:20px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:18px;">New Lead Received</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${APP_NAME}</p></td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 16px;color:${textColor};font-size:15px;">A new lead has been submitted from your website.</p>
        <table role="presentation" width="100%" style="background:${bgColor};border-radius:8px;padding:16px;margin:16px 0;">
          <tr><td>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Name</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.leadName)}</p>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Email</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.leadEmail)}</p>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Phone</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.leadPhone)}</p>
            ${data.propertyName ? `<p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Property</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.propertyName)}</p>` : ''}
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Message</p><p style="margin:0;color:${textColor};font-size:14px;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;text-align:center;"><a href="${leadUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,${primaryColor},${primaryLight});color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">View Lead</a></p>
      </td></tr>
      <tr><td style="background:${bgColor};padding:16px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:${textMuted};font-size:11px;text-align:center;">&copy; ${new Date().getFullYear()} ${APP_NAME}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();
}

function getNewEnquiryAlertHtml(data: NewEnquiryAlertData): string {
  const queryUrl = `${FRONTEND_URL}/admin/queries`;
  const primaryColor = '#0d9488';
  const primaryLight = '#14b8a6';
  const bgColor = '#f8fafc';
  const textColor = '#1e293b';
  const textMuted = '#64748b';
  return `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Enquiry – ${APP_NAME}</title></head>
<body style="margin:0;font-family:'Segoe UI',sans-serif;background:${bgColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,${primaryColor},${primaryLight});padding:20px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:18px;">New Enquiry Received</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${APP_NAME}</p></td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 16px;color:${textColor};font-size:15px;">A new enquiry has been submitted from your website.</p>
        <table role="presentation" width="100%" style="background:${bgColor};border-radius:8px;padding:16px;margin:16px 0;">
          <tr><td>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Name</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.name)}</p>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Email</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.email)}</p>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Phone</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.phone)}</p>
            ${data.interestedProperty ? `<p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Interested in</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.interestedProperty)}</p>` : ''}
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Message</p><p style="margin:0;color:${textColor};font-size:14px;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;text-align:center;"><a href="${queryUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,${primaryColor},${primaryLight});color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">View Queries</a></p>
      </td></tr>
      <tr><td style="background:${bgColor};padding:16px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:${textMuted};font-size:11px;text-align:center;">&copy; ${new Date().getFullYear()} ${APP_NAME}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();
}

function getFollowUpDueAlertHtml(data: FollowUpDueAlertData): string {
  const leadUrl = `${FRONTEND_URL}/admin/leads/${data.leadId}`;
  const dueStr = data.followUpDueAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const primaryColor = '#0d9488';
  const primaryLight = '#14b8a6';
  const bgColor = '#f8fafc';
  const textColor = '#1e293b';
  const textMuted = '#64748b';
  return `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Follow-up Due – ${APP_NAME}</title></head>
<body style="margin:0;font-family:'Segoe UI',sans-serif;background:${bgColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:24px;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,${primaryColor},${primaryLight});padding:20px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:18px;">Follow-up Due</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${APP_NAME}</p></td></tr>
      <tr><td style="padding:24px;">
        <p style="margin:0 0 16px;color:${textColor};font-size:15px;">A scheduled follow-up has reached its due date and time.</p>
        <table role="presentation" width="100%" style="background:${bgColor};border-radius:8px;padding:16px;margin:16px 0;">
          <tr><td>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Task</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${escapeHtml(data.followUpTitle)}</p>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Due</p><p style="margin:0 0 12px;color:${textColor};font-size:14px;">${dueStr}</p>
            <p style="margin:0 0 6px;color:${textMuted};font-size:12px;">Lead</p><p style="margin:0 0 4px;color:${textColor};font-size:14px;">${escapeHtml(data.leadName)} · ${escapeHtml(data.leadEmail)} · ${escapeHtml(data.leadPhone)}</p>
            ${data.propertyName ? `<p style="margin:8px 0 0;color:${textMuted};font-size:13px;">Property: ${escapeHtml(data.propertyName)}</p>` : ''}
          </td></tr>
        </table>
        <p style="margin:20px 0 0;text-align:center;"><a href="${leadUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,${primaryColor},${primaryLight});color:#fff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">View Lead</a></p>
      </td></tr>
      <tr><td style="background:${bgColor};padding:16px;border-top:1px solid #e2e8f0;"><p style="margin:0;color:${textMuted};font-size:11px;text-align:center;">&copy; ${new Date().getFullYear()} ${APP_NAME}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`.trim();
}

/** Send new-lead alert to all admin emails. Fires and forgets. */
export async function sendNewLeadAlertToAdmins(adminEmails: string[], data: NewLeadAlertData): Promise<void> {
  if (!isEmailConfigured() || adminEmails.length === 0) return;
  const html = getNewLeadAlertHtml(data);
  const subject = `New lead: ${data.leadName} – ${data.propertyName || 'Enquiry'} – ${APP_NAME}`;
  for (const to of adminEmails) {
    try {
      await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
    } catch (err) {
      console.error('[Email] Failed to send new-lead alert to', to, err);
    }
  }
}

/** Send new-enquiry alert to all admin emails. Fires and forgets. */
export async function sendNewEnquiryAlertToAdmins(adminEmails: string[], data: NewEnquiryAlertData): Promise<void> {
  if (!isEmailConfigured() || adminEmails.length === 0) return;
  const html = getNewEnquiryAlertHtml(data);
  const subject = `New enquiry: ${data.name} – ${APP_NAME}`;
  for (const to of adminEmails) {
    try {
      await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
    } catch (err) {
      console.error('[Email] Failed to send new-enquiry alert to', to, err);
    }
  }
}

/** Send follow-up-due alert to all admin emails. Fires and forgets. */
export async function sendFollowUpDueAlertToAdmins(adminEmails: string[], data: FollowUpDueAlertData): Promise<void> {
  if (!isEmailConfigured() || adminEmails.length === 0) return;
  const html = getFollowUpDueAlertHtml(data);
  const subject = `Follow-up due: ${data.followUpTitle} – ${data.leadName} – ${APP_NAME}`;
  for (const to of adminEmails) {
    try {
      await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
    } catch (err) {
      console.error('[Email] Failed to send follow-up-due alert to', to, err);
    }
  }
}
