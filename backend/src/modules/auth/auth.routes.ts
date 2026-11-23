import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../../common/middleware/auth.middleware';
import { authRateLimiter } from '../../common/middleware/rateLimit.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { authController } from './auth.controller';
import {
  adminRegisterSchema,
  changePasswordSchema,
  googleLoginSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  subAdminCreateSchema,
  switchOrganizationSchema,
} from './auth.schema';

export const authRouter = Router();

// --- public ---------------------------------------------------------------
authRouter.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);
authRouter.post(
  '/admin/register',
  authRateLimiter,
  validate({ body: adminRegisterSchema }),
  asyncHandler(authController.adminRegister),
);
authRouter.get('/admin/status', asyncHandler(authController.adminStatus));
authRouter.post('/app-register', authRateLimiter, asyncHandler(authController.appRegister));
authRouter.post('/send-otp', authRateLimiter, asyncHandler(authController.sendOtp));
authRouter.post('/verify-otp', authRateLimiter, asyncHandler(authController.verifyOtp));
authRouter.post('/reset-password', authRateLimiter, asyncHandler(authController.resetPassword));
authRouter.all('/test-email', asyncHandler(authController.testEmail));
authRouter.all('/test-sms', asyncHandler(authController.testSms));
authRouter.all('/broadcast-welcome', asyncHandler(authController.broadcastWelcomeEmails));
authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);
authRouter.post(
  '/admin/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.adminLogin),
);
authRouter.post(
  '/crm/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.crmLogin),
);
authRouter.post(
  '/app/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.appLogin),
);
authRouter.post(
  '/google',
  authRateLimiter,
  validate({ body: googleLoginSchema }),
  asyncHandler(authController.googleLogin),
);
authRouter.post(
  '/app/google',
  authRateLimiter,
  validate({ body: googleLoginSchema }),
  asyncHandler(authController.googleLogin),
);
authRouter.post(
  '/refresh',
  authRateLimiter,
  validate({ body: refreshSchema }),
  asyncHandler(authController.refresh),
);
authRouter.post('/logout', validate({ body: refreshSchema }), asyncHandler(authController.logout));

// --- authenticated --------------------------------------------------------
authRouter.use(requireAuth);
authRouter.get('/me', asyncHandler(authController.me));
authRouter.post('/logout-all', asyncHandler(authController.logoutAll));
authRouter.post(
  '/switch-organization',
  validate({ body: switchOrganizationSchema }),
  asyncHandler(authController.switchOrganization),
);
authRouter.post(
  '/change-password',
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);

// --- super-admin only endpoints under /auth --------------------------------
authRouter.get(
  '/admin/sub-admins',
  requireSuperAdmin,
  asyncHandler(authController.listSubSuperAdmins),
);
authRouter.post(
  '/admin/sub-admins',
  requireSuperAdmin,
  validate({ body: subAdminCreateSchema }),
  asyncHandler(authController.createSubSuperAdmin),
);
authRouter.delete(
  '/admin/sub-admins/:id',
  requireSuperAdmin,
  asyncHandler(authController.deleteSubSuperAdmin),
);
