import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL || 'akshitnannaware12@gmail.com';
const SENDGRID_FROM_NAME =
  process.env.SENDGRID_FROM_NAME || 'Fioner CRM';

export async function POST(req: NextRequest) {
  try {
    if (!SENDGRID_API_KEY) {
      console.error('[SendCredentials] Missing SENDGRID_API_KEY environment variable.');
      return NextResponse.json(
        { success: false, error: 'Email service is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      email,
      firstName,
      lastName,
      temporaryPassword,
      role = 'Employee',
      organizationName = 'Fioner CRM',
      loginUrl = 'https://fioner-crm.vercel.app',
    } = body;

    if (!email || !firstName || !temporaryPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, First Name, and Temporary Password are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = (lastName || '').trim();
    const fullName = cleanLastName && cleanLastName !== '-' ? `${cleanFirstName} ${cleanLastName}` : cleanFirstName;
    const roleLabel =
      role === 'TEAM_HEAD' || role === 'Team Head'
        ? 'Team Head'
        : role === 'ADMIN' || role === 'Administrator'
        ? 'Administrator'
        : 'Employee / Sales Executive';

    const subject = `Your Account Credentials for ${organizationName} - Welcome ${cleanFirstName}!`;

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
                You have been granted access to the <strong>${organizationName}</strong> portal as a <strong>${roleLabel}</strong>. You can now log in using the credentials below:
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
                        ${cleanEmail}
                      </div>
                    </div>

                    <!-- Divider -->
                    <div style="border-top: 1px dashed #cbd5e1; margin: 16px 0;"></div>

                    <!-- Password -->
                    <div>
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 5px;">
                        Auto-Generated Temporary Password
                      </div>
                      <div style="display: inline-block; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 14px; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 800; letter-spacing: 1.5px; color: #1d4ed8;">
                        ${temporaryPassword}
                      </div>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                      Log In to Your CRM Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 16px; margin: 0 0 24px;">
                <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #92400e;">
                  <strong>Important Security Reminder:</strong> This is a temporary password. For your account security, please change your password immediately upon your first login. Never share these credentials with anyone.
                </p>
              </div>

              <p style="font-size: 13.5px; line-height: 1.5; color: #64748b; margin: 0;">
                If you have any questions or need assistance, please contact your organization administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 6px;">This is an automated system notification from ${organizationName}.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const plainText = `Welcome to ${organizationName}, ${fullName}!\n\nYour account has been created with role: ${roleLabel}\n\nUser ID / Email: ${cleanEmail}\nTemporary Password: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\nPlease change your password after logging in.`;

    const sgPayload = {
      personalizations: [
        {
          to: [{ email: cleanEmail }],
          subject,
        },
      ],
      from: {
        email: SENDGRID_FROM_EMAIL.trim(),
        name: SENDGRID_FROM_NAME,
      },
      reply_to: {
        email: SENDGRID_FROM_EMAIL.trim(),
        name: SENDGRID_FROM_NAME,
      },
      subject,
      content: [
        {
          type: 'text/plain',
          value: plainText,
        },
        {
          type: 'text/html',
          value: html,
        },
      ],
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      },
      mail_settings: {
        bypass_list_management: { enable: true },
      },
      headers: {
        'X-Priority': '1',
        Importance: 'high',
      },
    };

    console.log(`[SendCredentials] Sending credentials email to ${cleanEmail} via SendGrid...`);

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgPayload),
    });

    if (sgResponse.status === 202 || sgResponse.status === 200) {
      console.log(`[SendCredentials] Email successfully sent to ${cleanEmail} (Status ${sgResponse.status})`);
      return NextResponse.json({
        success: true,
        message: `Credentials email sent successfully to ${cleanEmail}`,
        email: cleanEmail,
      });
    }

    const errorText = await sgResponse.text();
    console.error(`[SendCredentials] SendGrid API error (${sgResponse.status}):`, errorText);

    return NextResponse.json(
      {
        success: false,
        error: `SendGrid error (${sgResponse.status}): ${errorText}`,
        statusCode: sgResponse.status,
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('[SendCredentials] Internal error sending credentials email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}