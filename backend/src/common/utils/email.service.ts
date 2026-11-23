import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'sendgrid_api' | 'smtp' | 'console_fallback';
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = env.SMTP_HOST || 'smtp.sendgrid.net';
    const port = env.SMTP_PORT || 587;
    const isGmail = host.toLowerCase().includes('gmail');
    const user = env.SMTP_USER || (isGmail ? env.SENDER_EMAIL : (env.SENDGRID_API_KEY ? 'apikey' : ''));
    const pass = env.SMTP_PASS || env.SENDGRID_API_KEY || '';

    if (user && pass) {
      try {
        if (isGmail) {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user,
              pass,
            },
          });
        } else {
          this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: env.SMTP_SECURE || port === 465,
            auth: {
              user,
              pass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });
        }
      } catch (err) {
        console.error('[EmailService] Failed to initialize nodemailer transporter:', err);
      }
    } else {
      console.warn('[EmailService] Neither SENDGRID_API_KEY nor SMTP credentials provided.');
    }
  }

  /**
   * Primary method to send an email.
   * If Gmail SMTP is configured, it sends via Gmail directly for 100% inbox deliverability.
   * Otherwise tries SendGrid HTTP API with anti-spam optimizations (disabled tracking, reply-to),
   * falling back to Nodemailer SMTP.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const { to, subject, html, text } = options;
    const fromEmail =
      options.from ||
      env.SENDGRID_FROM_EMAIL ||
      env.SMTP_FROM_EMAIL ||
      env.SENDER_EMAIL ||
      'akshitnannaware12@gmail.com';
    const fromName = options.fromName || env.SMTP_FROM_NAME || 'CarQ Connect';

    const isGmailSmtp = (env.SMTP_HOST || '').toLowerCase().includes('gmail');

    // 1. If direct Gmail SMTP is configured, prioritize it for 100% Google Inbox delivery
    if (isGmailSmtp && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: to.trim(),
          replyTo: `"${fromName}" <${fromEmail}>`,
          subject,
          text: text || html.replace(/<[^>]*>?/gm, ''),
          html,
          headers: {
            'X-Priority': '1',
            'Importance': 'high',
          },
        });

        console.log(`[EmailService] Email sent via Gmail SMTP to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (smtpError: any) {
        console.error(`[EmailService] Gmail SMTP delivery failed for ${to}:`, smtpError.message);
      }
    }

    // 2. Try SendGrid v3 REST API if SENDGRID_API_KEY is available
    if (env.SENDGRID_API_KEY && env.SENDGRID_API_KEY.startsWith('SG.')) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to.trim() }] }],
            from: { email: fromEmail.trim(), name: fromName },
            reply_to: { email: fromEmail.trim(), name: fromName },
            subject,
            content: [
              ...(text ? [{ type: 'text/plain', value: text }] : []),
              { type: 'text/html', value: html },
            ],
            // High deliverability transactional settings (disabling click/open tracking avoids spam scoring)
            tracking_settings: {
              click_tracking: { enable: false, enable_text: false },
              open_tracking: { enable: false },
            },
            mail_settings: {
              bypass_list_management: { enable: true },
            },
            headers: {
              'X-Priority': '1',
              'Importance': 'high',
            },
          }),
        });

        if (response.status === 202 || response.status === 200) {
          const msgId = response.headers.get('x-message-id') || 'sendgrid-ok';
          console.log(`[EmailService] Email sent via SendGrid API to ${to} (${subject})`);
          return { success: true, messageId: msgId, provider: 'sendgrid_api' };
        }

        const errorBody = await response.text();
        console.warn(
          `[EmailService] SendGrid REST API returned ${response.status}: ${errorBody}. Attempting SMTP fallback...`,
        );
      } catch (sgError: any) {
        console.warn(`[EmailService] SendGrid REST API error: ${sgError.message}. Falling back to SMTP...`);
      }
    }

    // 3. Try Nodemailer SMTP Transporter
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: to.trim(),
          replyTo: `"${fromName}" <${fromEmail}>`,
          subject,
          text: text || html.replace(/<[^>]*>?/gm, ''),
          html,
          headers: {
            'X-Priority': '1',
            'Importance': 'high',
          },
        });

        console.log(`[EmailService] Email sent via SMTP to ${to} (MessageId: ${info.messageId})`);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (smtpError: any) {
        console.error(`[EmailService] SMTP delivery failed for ${to}:`, smtpError.message);
        return { success: false, error: smtpError.message, provider: 'smtp' };
      }
    }

    // 4. Fallback: log to console so development workflow is never blocked
    console.log(`\n📧 [EmailService Fallback Console] To: ${to} | Subject: ${subject}`);
    return {
      success: false,
      error: 'No active email provider succeeded (check SendGrid credits or SMTP settings)',
      provider: 'console_fallback',
    };
  }

  /**
   * Sends an OTP verification email using high-deliverability clean layout
   * Designed to pass Gmail / Outlook spam filters without getting flagged.
   */
  async sendOtpEmail(to: string, otp: string, purpose: string = 'verification'): Promise<EmailResult> {
    const title =
      purpose === 'reset_password'
        ? 'Password Reset Code'
        : purpose === 'registration'
          ? 'Confirm Your Email'
          : 'Your Verification Code';

    // Standard high-reputation subject format
    const subject = `${otp} is your verification code for CarQ Connect`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 24px 20px; text-align: center; border-bottom: 1px solid #edf2f7;">
              <div style="display: inline-block; background-color: #0066FF; color: #ffffff; padding: 5px 14px; border-radius: 16px; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; margin-bottom: 10px;">
                CARQ CONNECT
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 28px 28px 24px; text-align: center;">
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                We received a request to verify your account on <strong>CarQ Connect</strong>. Please use the verification code below:
              </p>

              <!-- OTP Code Display -->
              <table role="presentation" align="center" style="margin: 20px auto;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #f8fafc; border: 1.5px solid #0066FF; border-radius: 10px; padding: 14px 28px; text-align: center;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0066FF; display: block;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #d97706; font-weight: 600; margin: 16px 0 20px;">
                ⏱️ Valid for 10 minutes.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; text-align: left; font-size: 12px; color: #64748b; line-height: 1.5;">
                <strong style="color: #334155;">Security Notice:</strong> Never share this code with anyone. CarQ Connect will never call or ask for your verification code.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #edf2f7; background-color: #fafbfc;">
              <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} CarQ Connect. All rights reserved.</p>
              <p style="margin: 0;">This is an automated security message. Replies to this address are not monitored.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `CarQ Connect - ${title}\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nSecurity Notice: Never share this verification code with anyone.\n\n© ${new Date().getFullYear()} CarQ Connect`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Sends account credentials (Email ID & Auto-generated Password) to newly created CRM team member
   */
  async sendUserCredentialsEmail(params: {
    to?: string;
    firstName: string;
    lastName?: string;
    email: string;
    temporaryPassword: string;
    role: string;
    organizationName?: string;
    loginUrl?: string;
  }): Promise<EmailResult> {
    const {
      to,
      firstName,
      lastName,
      email,
      temporaryPassword,
      role,
      organizationName = 'Fioner CRM',
      loginUrl = process.env.CRM_URL || 'https://fioner-crm.vercel.app',
    } = params;

    const recipient = (to || email).trim();
    const roleName =
      role === 'TEAM_HEAD'
        ? 'Team Head'
        : role === 'ADMIN' || role === 'OWNER'
          ? 'Administrator'
          : 'Employee / Sales Executive';
    const fullName = `${firstName} ${lastName && lastName !== '-' ? lastName : ''}`.trim();
    const subject = `Your Account Credentials for ${organizationName} - Welcome ${firstName}!`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Account Credentials</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #2563eb; background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: 36px 28px 28px; text-align: center; color: #ffffff;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.2); backdrop-filter: blur(4px); color: #ffffff; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                ${organizationName}
              </div>
              <h1 style="margin: 0 0 6px; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Welcome to ${organizationName}!
              </h1>
              <p style="margin: 0; font-size: 14px; color: #dbeafe; opacity: 0.95;">
                Your account has been created by your administrator.
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px 24px;">
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
                Hello <strong>${fullName}</strong>,
              </p>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                You have been granted access to the <strong>${organizationName}</strong> portal as a <strong>${roleName}</strong>. You can now log in using the credentials below:
              </p>

              <!-- Credentials Card -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; margin: 0 0 24px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 20px 24px;">
                    
                    <!-- Login ID / Email -->
                    <div style="margin-bottom: 16px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 5px;">
                        User ID / Email Address
                      </div>
                      <div style="font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 700; color: #0f172a; word-break: break-all;">
                        ${email}
                      </div>
                    </div>

                    <!-- Divider -->
                    <div style="border-top: 1px dashed #cbd5e1; margin: 14px 0;"></div>

                    <!-- Auto-generated Password -->
                    <div style="margin-bottom: 16px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 5px;">
                        Auto-Generated Password
                      </div>
                      <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 8px 16px; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 800; color: #1d4ed8; letter-spacing: 2px;">
                        ${temporaryPassword}
                      </div>
                    </div>

                    <!-- Role -->
                    <div>
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 4px;">
                        Assigned Role
                      </div>
                      <div style="font-size: 14px; font-weight: 600; color: #334155;">
                        ${roleName}
                      </div>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 700; padding: 13px 36px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                      Sign In to CRM Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; font-size: 12.5px; color: #92400e; line-height: 1.5;">
                <strong>Security Reminder:</strong> For your security, please update your temporary password immediately after your first sign in. Never share your credentials with anyone.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #edf2f7; background-color: #fafbfc;">
              <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
              <p style="margin: 0;">This is an automated notification. If you did not expect this email, please contact your administrator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `${organizationName} - Account Credentials\n\nHello ${fullName},\n\nYour account has been created on ${organizationName} with the role of ${roleName}.\n\nYour Login Details:\n- Email / User ID: ${email}\n- Temporary Password: ${temporaryPassword}\n- Login Portal: ${loginUrl}\n\nPlease update your password after your first sign in.\n\n© ${new Date().getFullYear()} ${organizationName}`;

    return this.sendEmail({ to: recipient, subject, html, text });
  }

  /**
   * Sends a modern welcome email to newly registered users
   */
  async sendWelcomeEmail(to: string, firstName: string): Promise<EmailResult> {
    const subject = `Welcome to CarQ Connect, ${firstName || 'Member'}!`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CarQ Connect</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 30px 24px 20px; text-align: center; background-color: #0066FF; color: #ffffff;">
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700;">Welcome to CarQ Connect!</h1>
              <p style="margin: 0; font-size: 14px; opacity: 0.9;">Your connected vehicle safety ecosystem is ready.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
                Hello <strong>${firstName || 'Valued Member'}</strong>,
              </p>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                Thank you for joining <strong>CarQ Connect</strong>. We make your drives safer and smarter with instant emergency SOS, vehicle QR protection, and real-time live telemetry.
              </p>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
                If you have any questions, our support team is always here to help.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #edf2f7; background-color: #fafbfc;">
              <p style="margin: 0;">© ${new Date().getFullYear()} CarQ Connect. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `Welcome to CarQ Connect, ${firstName || 'Member'}!\n\nYour connected vehicle safety ecosystem is ready.\n\nThank you for choosing CarQ Connect!`;

    return this.sendEmail({ to, subject, html, text });
  }

  /**
   * Sends a password reset notification email
   */
  async sendPasswordResetEmail(to: string, resetCodeOrLink: string): Promise<EmailResult> {
    const subject = `Reset your CarQ Connect password`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 30px; text-align: center;">
          <tr>
            <td>
              <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a;">Password Reset Request</h2>
              <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px;">Use the code below to reset your CarQ Connect password:</p>
              <div style="display: inline-block; font-family: monospace; font-size: 30px; font-weight: bold; letter-spacing: 6px; color: #0066FF; padding: 12px 24px; background: #f1f5f9; border-radius: 8px;">
                ${resetCodeOrLink}
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">If you did not request this, please ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text: `Password Reset Request - Your code is: ${resetCodeOrLink}`,
    });
  }
}

export const emailService = new EmailService();
