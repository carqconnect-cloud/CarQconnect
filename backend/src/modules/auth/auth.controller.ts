import type { Request, Response } from 'express';
import { ApiResponse } from '../../common/utils/apiResponse';
import { ApiError } from '../../common/utils/apiError';
import { prisma } from '../../config/database';
import { authService } from './auth.service';
import { authRepository } from './auth.repository';
import { syncUserToCustomer } from '../../common/utils/customerSync';
import { emailService } from '../../common/utils/email.service';
import { fast2smsService } from '../../common/utils/fast2sms.service';
import { msg91Service } from '../../common/utils/msg91.service';
import { env } from '../../config/env';
import type {
  AdminRegisterInput,
  ChangePasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  SubAdminCreateInput,
  SwitchOrganizationInput,
} from './auth.schema';
import type { SessionContext } from './auth.types';

function sessionFrom(req: Request): SessionContext {
  const headerPortal = req.headers['x-portal-type'] as string | undefined;
  let portal: 'super-admin' | 'crm' | 'app' | undefined;
  if (headerPortal === 'super-admin' || headerPortal === 'crm' || headerPortal === 'app') {
    portal = headerPortal;
  } else {
    const origin = (req.headers['origin'] || req.headers['referer'] || '').toString().toLowerCase();
    if (origin.includes('super-admin') || origin.includes(':3000')) {
      portal = 'super-admin';
    } else if (origin.includes('crm') || origin.includes(':5173')) {
      portal = 'crm';
    } else if (origin.includes(':3001') || origin.includes('app')) {
      portal = 'app';
    }
  }

  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
    portal,
  };
}

interface OtpRecord {
  code: string;
  expiresAt: number;
  reqId?: string;
}
const otpStore = new Map<string, OtpRecord>();

function getIdentifiers(email?: string, phone?: string): string[] {
  const ids: string[] = [];
  if (email && typeof email === 'string' && email.trim()) {
    const cleanEmail = email.trim();
    ids.push(cleanEmail.toLowerCase());
    ids.push(cleanEmail);
  }
  if (phone && typeof phone === 'string' && phone.trim()) {
    const cleanPhone = phone.trim();
    ids.push(cleanPhone);
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly && digitsOnly !== cleanPhone) {
      ids.push(digitsOnly);
    }
  }
  return Array.from(new Set(ids.filter(Boolean)));
}

function saveOtp(identifiers: string[], code: string, expiresAt: number) {
  for (const id of identifiers) {
    otpStore.set(id, { code, expiresAt });
  }

  // Persistent storage in PostgreSQL `otps` table (non-blocking)
  try {
    const expiresBigInt = BigInt(expiresAt);
    for (const ident of identifiers) {
      prisma
        .$executeRawUnsafe(
          `INSERT INTO "otps" ("id", "identifier", "code", "expiresAt")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("id") DO UPDATE SET "code" = $3, "expiresAt" = $4;`,
          ident,
          ident,
          code,
          expiresBigInt,
        )
        .catch(() => {});
    }
  } catch (err) {
    console.error('[AuthController] Error saving OTP to database:', err);
  }
}

async function getOtpRecord(identifiers: string[]): Promise<OtpRecord | undefined> {
  // 1. Check in-memory map first
  for (const id of identifiers) {
    if (otpStore.has(id)) {
      const rec = otpStore.get(id);
      if (rec && rec.expiresAt >= Date.now()) return rec;
    }
  }

  // 2. Fallback to database query (survives server sleep / restarts / workers)
  try {
    for (const id of identifiers) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "code", "expiresAt" FROM "otps" WHERE "identifier" = $1 ORDER BY "createdAt" DESC LIMIT 1;`,
        id,
      ).catch(() => []);
      if (rows && rows.length > 0) {
        const expiresAt = Number(rows[0].expiresAt);
        if (expiresAt >= Date.now()) {
          const rec: OtpRecord = { code: String(rows[0].code).trim(), expiresAt };
          otpStore.set(id, rec);
          return rec;
        }
      }
    }
  } catch (err) {
    console.error('[AuthController] Error fetching OTP from database:', err);
  }

  return undefined;
}

async function deleteOtp(identifiers: string[]) {
  for (const id of identifiers) {
    otpStore.delete(id);
  }
  try {
    for (const id of identifiers) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "otps" WHERE "identifier" = $1;`,
        id,
      ).catch(() => {});
    }
  } catch (_) {}
}

/** Controllers only: read the request, call the service, shape the response. */
export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body as RegisterInput, sessionFrom(req));
    if (result?.user?.email) {
      emailService.sendWelcomeEmail(result.user.email, result.user.firstName || 'User').catch((err) => {
        console.error('[AuthController] Welcome email failed:', err);
      });
    }
    return ApiResponse.created(res, result);
  },

  async adminRegister(req: Request, res: Response) {
    const result = await authService.adminRegister(req.body as AdminRegisterInput);
    return ApiResponse.created(res, result);
  },

  async adminStatus(_req: Request, res: Response) {
    const hasSuperAdmin = await authService.hasSuperAdmin();
    return ApiResponse.ok(res, { hasSuperAdmin });
  },

  async createSubSuperAdmin(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await authService.createSubSuperAdmin(
      req.auth.userId,
      req.body as SubAdminCreateInput,
    );
    return ApiResponse.created(res, result);
  },

  async listSubSuperAdmins(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await authService.listSubSuperAdmins(req.auth.userId);
    return ApiResponse.ok(res, result);
  },

  async deleteSubSuperAdmin(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params;
    if (!id) throw ApiError.badRequest('Sub admin ID is required');
    await authService.deleteSubSuperAdmin(req.auth.userId, id);
    return ApiResponse.noContent(res);
  },

  async appRegister(req: Request, res: Response) {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw ApiError.badRequest('Email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = (phone && typeof phone === 'string') ? phone.trim() : null;

    const result = await authService.register(
      {
        email: normalizedEmail,
        password,
        firstName: (firstName && typeof firstName === 'string') ? firstName.trim() : 'User',
        lastName: (lastName && typeof lastName === 'string') ? lastName.trim() : '',
        phone: cleanPhone || undefined,
        organizationName: 'Personal',
      },
      sessionFrom(req),
    );

    // Clean up OTP for this user after successful registration
    const identifiers = getIdentifiers(normalizedEmail, cleanPhone || undefined);
    deleteOtp(identifiers).catch(() => {});

    syncUserToCustomer(result.user.id).catch(console.error);

    // Send Welcome Email asynchronously
    emailService.sendWelcomeEmail(normalizedEmail, result.user.firstName || 'User').catch((err) => {
      console.error(`[AuthController] Welcome email error for ${normalizedEmail}:`, err);
    });

    return ApiResponse.created(res, result);
  },

  async sendOtp(req: Request, res: Response) {
    try {
      const { email, phone, type, purpose, channel } = req.body || {};
      const identifiers = getIdentifiers(email, phone);
      if (identifiers.length === 0) {
        throw ApiError.badRequest('Email or mobile number is required');
      }

      // Check if user exists when requesting password reset
      const targetEmail = (email && typeof email === 'string' && email.trim())
        ? email.trim()
        : identifiers.find((id) => id.includes('@') && !id.endsWith('@mobile.carq'));

      let targetPhone = (phone && typeof phone === 'string' && phone.trim())
        ? phone.trim()
        : identifiers.find((id) => !id.includes('@') && /^\+?\d{10,13}$/.test(id));

      if (type === 'reset' || purpose === 'reset') {
        const lookup = targetEmail || targetPhone;
        if (lookup) {
          const candidates = await authRepository.findUserCandidateByEmail(lookup);
          const exists = candidates.crmUser || candidates.user || candidates.superAdmin || candidates.subSuperAdmin;
          if (!exists) {
            throw ApiError.notFound(targetEmail ? 'No account found with this email address.' : 'No account found with this mobile number.');
          }
        }
      }

      const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      saveOtp(identifiers, code, expiresAt);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AuthController] Generated OTP [${code}] for [${identifiers.join(', ')}]`);
      }

      // Determine dispatch channels:
      // If channel is 'sms' or 'phone', send ONLY SMS (never email).
      // If channel is 'email', send ONLY Email (never SMS).
      const allowSms = channel !== 'email';
      const allowEmail = channel !== 'sms' && channel !== 'phone';

      // 1. Trigger SMS OTP dispatch (Primary: MSG91 Widget, Fallback: Fast2SMS)
      if (targetPhone && allowSms) {
        const headerVal = req.headers ? req.headers['x-forwarded-for'] : undefined;
        const rawIp = (Array.isArray(headerVal) ? headerVal[0] : headerVal) || req.ip || '';
        const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0]?.trim().replace(/^::ffff:/, '') : undefined;

        msg91Service.sendOtpSms(targetPhone, code, clientIp).then((res) => {
          if (res.success && res.requestId) {
            for (const id of identifiers) {
              const existing = otpStore.get(id);
              if (existing) existing.reqId = res.requestId;
            }
          } else if (!res.success) {
            console.warn(`[AuthController] MSG91 SMS dispatch unsuccessful (${res.error}), attempting Fast2SMS fallback...`);
            return fast2smsService.sendOtpSms(targetPhone!, code);
          }
        }).catch((err) => {
          console.error(`[AuthController] MSG91 error, trying Fast2SMS fallback:`, err);
          fast2smsService.sendOtpSms(targetPhone!, code).catch(console.error);
        });
      }

      // 2. Trigger OTP Email dispatch if an email is provided (ignore dummy mobile aliases like .carq)
      if (targetEmail && !targetEmail.endsWith('@mobile.carq') && allowEmail) {
        const emailType = (type === 'reset' || purpose === 'reset') ? 'reset' : 'verification';
        emailService.sendOtpEmail(targetEmail, code, emailType).catch((err) => {
          console.error(`[AuthController] Failed to send OTP email to ${targetEmail}:`, err);
        });
      }

      return ApiResponse.ok(res, {
        message: 'OTP sent successfully',
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: code } : {}),
      });
    } catch (err: any) {
      console.error('[AuthController sendOtp ERROR]', err);
      if (err instanceof ApiError) throw err;
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'Something went wrong',
          stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
        },
      });
    }
  },

  async verifyOtp(req: Request, res: Response) {
    const { email, phone, otp } = req.body;
    const identifiers = getIdentifiers(email, phone);
    if (identifiers.length === 0) {
      throw ApiError.badRequest('Email or mobile number is required');
    }

    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp) {
      throw ApiError.badRequest('OTP code is required');
    }

    const record = await getOtpRecord(identifiers);

    // In automated test runner environments only, allow test bypass code
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isMasterTestOtp = isTestEnv && (cleanOtp === '1234' || cleanOtp === '0000');
    if (!isMasterTestOtp) {
      let isWidgetVerified = false;
      if (record?.reqId) {
        const widgetVerify = await msg91Service.verifyOtpViaWidget(record.reqId, cleanOtp);
        if (widgetVerify.success) isWidgetVerified = true;
      }

      if (!isWidgetVerified && (!record || record.code !== cleanOtp || record.expiresAt < Date.now())) {
        throw ApiError.badRequest('Invalid or expired OTP');
      }
    }

    // Keep the record valid during registration step so user is not locked out if registration is retried
    return ApiResponse.ok(res, { success: true });
  },

  async login(req: Request, res: Response) {
    const session = sessionFrom(req);
    const body = req.body as LoginInput;
    const portal = body.portal || session.portal;
    const result = await authService.login({ ...body, portal }, session);
    return ApiResponse.ok(res, result);
  },

  async adminLogin(req: Request, res: Response) {
    const session = sessionFrom(req);
    session.portal = 'super-admin';
    const result = await authService.login({ ...(req.body as LoginInput), portal: 'super-admin' }, session);
    return ApiResponse.ok(res, result);
  },

  async crmLogin(req: Request, res: Response) {
    const session = sessionFrom(req);
    session.portal = 'crm';
    const result = await authService.login({ ...(req.body as LoginInput), portal: 'crm' }, session);
    return ApiResponse.ok(res, result);
  },

  async appLogin(req: Request, res: Response) {
    const session = sessionFrom(req);
    session.portal = 'app';
    const result = await authService.login({ ...(req.body as LoginInput), portal: 'app' }, session);
    return ApiResponse.ok(res, result);
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body as RefreshInput;
    const tokens = await authService.refresh(refreshToken, sessionFrom(req));
    return ApiResponse.ok(res, { tokens });
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body as RefreshInput;
    await authService.logout(refreshToken);
    return ApiResponse.noContent(res);
  },

  async logoutAll(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    await authService.logoutAll(req.auth.userId);
    return ApiResponse.noContent(res);
  },

  async me(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await authService.me(req.auth.userId);
    return ApiResponse.ok(res, result);
  },

  async switchOrganization(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { organizationId } = req.body as SwitchOrganizationInput;
    const result = await authService.switchOrganization(
      req.auth.userId,
      organizationId,
      sessionFrom(req),
    );
    return ApiResponse.ok(res, result);
  },

  async changePassword(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    await authService.changePassword(req.auth.userId, req.body as ChangePasswordInput, req.ip);
    return ApiResponse.noContent(res);
  },

  async resetPassword(req: Request, res: Response) {
    const { email, phone, newPassword } = req.body;
    const identifier = (email || phone || '').toString().trim();
    if (!identifier) {
      throw ApiError.badRequest('Email or mobile number is required');
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters');
    }

    await authService.resetPassword(identifier, newPassword);
    return ApiResponse.ok(res, { success: true, message: 'Password updated successfully' });
  },

  async googleLogin(req: Request, res: Response) {
    const result = await authService.googleLogin(req.body, sessionFrom(req));
    return ApiResponse.ok(res, result);
  },

  async testEmail(req: Request, res: Response) {
    const targetEmail = (
      req.body?.to ||
      req.query?.to ||
      env.SENDGRID_FROM_EMAIL ||
      'akshitnannaware@gmail.com'
    )
      .toString()
      .trim();
    const type = (req.body?.type || req.query?.type || 'otp').toString().trim();

    let result;
    if (type === 'welcome') {
      result = await emailService.sendWelcomeEmail(targetEmail, 'CarQ User');
    } else {
      result = await emailService.sendOtpEmail(targetEmail, '1234', 'verification');
    }

    return ApiResponse.ok(res, {
      message: `Test email (${type}) processed for ${targetEmail}`,
      details: result,
    });
  },

  async testSms(req: Request, res: Response) {
    const targetPhone = (
      req.body?.phone ||
      req.query?.phone ||
      req.body?.to ||
      req.query?.to ||
      ''
    ).toString().trim();

    if (!targetPhone) {
      throw ApiError.badRequest('Phone number is required (e.g. ?phone=9876543210)');
    }

    const headerVal = req.headers ? req.headers['x-forwarded-for'] : undefined;
    const rawIp = (Array.isArray(headerVal) ? headerVal[0] : headerVal) || req.ip || '';
    const clientIp = typeof rawIp === 'string' && rawIp.trim()
      ? rawIp.split(',')[0]?.trim().replace(/^::ffff:/, '')
      : undefined;

    const widgetResult = await msg91Service.sendOtpViaWidget(targetPhone, clientIp);

    return ApiResponse.ok(res, {
      message: `Test SMS dispatched to ${targetPhone}`,
      buildVersion: 'v5-expose-error',
      widgetResult,
    });
  },

  async broadcastWelcomeEmails(_req: Request, res: Response) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const eligibleUsers = users.filter(
      (u) => u.email && u.email.includes('@') && !u.email.endsWith('@mobile.carq'),
    );

    let successCount = 0;
    let failCount = 0;
    const details: any[] = [];

    for (const u of eligibleUsers) {
      const result = await emailService.sendWelcomeEmail(u.email, u.firstName || 'Member');
      if (result.success) successCount++;
      else failCount++;
      details.push({ email: u.email, name: u.firstName, result });
    }

    return ApiResponse.ok(res, {
      message: `Broadcast complete: ${successCount} sent, ${failCount} failed out of ${eligibleUsers.length} users`,
      total: eligibleUsers.length,
      successCount,
      failCount,
      details,
    });
  },
};
