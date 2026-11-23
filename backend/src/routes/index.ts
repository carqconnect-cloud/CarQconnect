import { Router } from 'express';
import { requireAuth, requireSuperAdmin, optionalAuth, requireAppUser, requireCrmUser } from '../common/middleware/auth.middleware';
import { publicRateLimiter } from '../common/middleware/rateLimit.middleware';
import { resolveTenant } from '../common/middleware/tenant.middleware';
import { validate } from '../common/middleware/validate.middleware';
import { asyncHandler } from '../common/utils/asyncHandler';

// Super admin & core routes
import { adminRoutes } from '../modules/admin/admin.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { crmRouter } from '../modules/crm';
import { healthRouter } from '../modules/health/health.routes';
import { membershipRouter } from '../modules/memberships/membership.routes';
import { organizationRouter } from '../modules/organization/organization.routes';
import { userRouter } from '../modules/users/user.routes';
import { vehicleRouter } from '../modules/vehicles/vehicle.routes';
import { qrPublicRouter } from '../modules/qr/qr.routes';
import { webhookRouter } from '../modules/payment/webhook.routes';

// App modules routes & controllers
import { appProfileRouter } from '../modules/app/profile/appProfile.routes';
import { appQrRouter } from '../modules/app/qr/appQr.routes';
import { appQrController } from '../modules/app/qr/appQr.controller';
import { mapsController } from '../modules/app/maps/maps.controller';
import { documentsRouter } from '../modules/app/documents/documents.routes';
import { notificationRouter } from '../modules/app/notifications/notifications.routes';
import { reminderRouter } from '../modules/app/reminders/reminders.routes';
import { storeRouter } from '../modules/app/store/store.routes';
import { subscriptionRouter } from '../modules/app/subscriptions/subscriptions.routes';
import { tripsRouter } from '../modules/app/trips/trips.routes';
import { ticketsRouter } from '../modules/app/tickets/tickets.routes';
import { sosRouter as appSosRouter } from '../modules/app/sos/sos.routes';
import { aiChatRouter } from '../modules/ai/ai.routes';
import { adminCouponRoutes } from '../modules/admin/cms/adminCoupon.routes';
import { adminGpsController } from '../modules/admin/gps/adminGps.controller';
import { recordTelemetrySchema } from '../modules/admin/gps/adminGps.schema';
import { leadController } from '../modules/crm/leads/lead.controller';

/**
 * Three groups:
 *
 *   publicRouter  - no token required. Rate limited hard where appropriate.
 *   privateRouter - requireAuth + resolveTenant run for EVERY route (CRM & Organization scoped).
 *   adminRouter   - requireAuth + requireSuperAdmin run for platform authority.
 *   appRouter     - requireAuth runs for consumer mobile/web vehicle owners.
 */
const publicRouter = Router();
publicRouter.use('/health', healthRouter);
publicRouter.use('/auth', authRouter);
publicRouter.use('/webhooks', webhookRouter);
publicRouter.use('/qr', publicRateLimiter, qrPublicRouter);

// Public Scan and Vehicle Image for QR tags
publicRouter.get('/scan/:tagId', asyncHandler(appQrController.getPublicTagInfo));
publicRouter.post('/scan/:tagId/call', asyncHandler(appQrController.initiateMaskedCall));
publicRouter.post('/scan/:tagId/message', asyncHandler(appQrController.sendOwnerMessage));
publicRouter.get('/vehicle-image', asyncHandler(appQrController.getVehicleImage));
publicRouter.get('/vehicle-lookup', asyncHandler(appQrController.lookupVehicle));
publicRouter.get('/maps/autosuggest', asyncHandler(mapsController.autosuggest));
publicRouter.get('/maps/reverse-geocode', asyncHandler(mapsController.reverseGeocode));
publicRouter.get('/maps/geocode', asyncHandler(mapsController.geocode));
publicRouter.get('/maps/direction', asyncHandler(mapsController.direction));

// Public / Semi-public endpoints with optional authentication
publicRouter.post('/gps/telemetry', optionalAuth, validate({ body: recordTelemetrySchema }), asyncHandler(adminGpsController.recordTelemetry));
publicRouter.use('/support-tickets', optionalAuth, ticketsRouter);
publicRouter.post('/crm/leads/public', optionalAuth, asyncHandler(leadController.createPublicLead));
publicRouter.post('/leads/public', optionalAuth, asyncHandler(leadController.createPublicLead));
publicRouter.post('/leads', optionalAuth, asyncHandler(leadController.createPublicLead));
publicRouter.use('/sos', optionalAuth, appSosRouter);
publicRouter.use('/ai', optionalAuth, aiChatRouter);
publicRouter.use('/store', optionalAuth, storeRouter);
publicRouter.use('/coupons', optionalAuth, adminCouponRoutes);

const privateMiddleware = [requireAuth, requireCrmUser, resolveTenant];

const privateRouter = Router();
privateRouter.use('/users', ...privateMiddleware, userRouter);
privateRouter.use('/organizations', ...privateMiddleware, organizationRouter);
privateRouter.use('/crm', ...privateMiddleware, crmRouter);

const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperAdmin);
adminRouter.use(adminRoutes);

export const v1Router = Router();
v1Router.use(publicRouter);
v1Router.use('/admin', adminRouter);
v1Router.use(privateRouter);

// App Consumer / Authenticated routes (strictly for users table)
v1Router.use('/app-profile', requireAuth, requireAppUser, appProfileRouter);
v1Router.use('/app-qr', requireAuth, requireAppUser, appQrRouter);
v1Router.use('/documents', requireAuth, requireAppUser, documentsRouter);
v1Router.use('/notifications', requireAuth, requireAppUser, notificationRouter);
v1Router.use('/reminders', requireAuth, requireAppUser, reminderRouter);
v1Router.use('/subscriptions', requireAuth, requireAppUser, subscriptionRouter);
v1Router.use('/trips', requireAuth, requireAppUser, tripsRouter);
v1Router.use('/vehicles', requireAuth, requireAppUser, vehicleRouter);
v1Router.use('/memberships', membershipRouter);

export { publicRouter, privateRouter, adminRouter };
