import { Router } from 'express';
import { ApiResponse } from '../../common/utils/apiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validate } from '../../common/middleware/validate.middleware';
import { authController } from '../auth/auth.controller';
import { subAdminCreateSchema } from '../auth/auth.schema';
import { adminAuditLogRoutes } from './auditLogs/adminAuditLog.routes';
import { adminDashboardRoutes } from './dashboard/adminDashboard.routes';
import { adminGpsRoutes } from './gps/adminGps.routes';
import { adminInventoryRoutes } from './inventory/adminInventory.routes';
import { adminMembershipRoutes } from './memberships/adminMembership.routes';
import { adminOrdersRoutes } from './orders/adminOrders.routes';
import { adminOrganizationRoutes } from './organizations/adminOrganization.routes';
import { adminQrRoutes } from './qr/adminQr.routes';
import { adminSosRoutes } from './sos/adminSos.routes';
import { adminSupportRoutes } from './support/adminSupport.routes';
import { adminAiRoutes } from './ai/adminAi.routes';
import { adminReportsRoutes } from './reports/adminReports.routes';
import { adminBannerRoutes, adminCampaignRoutes } from './cms/adminCms.routes';
import { adminCouponRoutes } from './cms/adminCoupon.routes';
import { adminUserRoutes } from './users/adminUser.routes';
import { adminVehicleRoutes } from './vehicles/adminVehicle.routes';
import { adminCrmRoutes } from './crm/adminCrm.routes';
import { adminRoleRoutes } from './roles/adminRole.routes';

export const adminRoutes = Router();

adminRoutes.get('/health', (_req, res) => {
  return ApiResponse.ok(res, { status: 'ok' });
});

adminRoutes.use('/users', adminUserRoutes);
adminRoutes.use('/organizations', adminOrganizationRoutes);
adminRoutes.use('/audit-logs', adminAuditLogRoutes);
adminRoutes.use('/dashboard', adminDashboardRoutes);
adminRoutes.use('/sos', adminSosRoutes);
adminRoutes.use('/vehicles', adminVehicleRoutes);
adminRoutes.use('/qr', adminQrRoutes);
adminRoutes.use('/gps', adminGpsRoutes);
adminRoutes.use('/inventory', adminInventoryRoutes);
adminRoutes.use('/orders', adminOrdersRoutes);
adminRoutes.use('/memberships', adminMembershipRoutes);
adminRoutes.use('/support', adminSupportRoutes);
adminRoutes.use('/ai', adminAiRoutes);
adminRoutes.use('/reports', adminReportsRoutes);
adminRoutes.use('/banners', adminBannerRoutes);
adminRoutes.use('/coupons', adminCouponRoutes);
adminRoutes.use('/campaigns', adminCampaignRoutes);
adminRoutes.use('/crm', adminCrmRoutes);
adminRoutes.use('/roles', adminRoleRoutes);

// Dedicated sub-super admin endpoints (restricted to Super Admins via adminRouter middleware)
adminRoutes.get('/sub-admins', asyncHandler(authController.listSubSuperAdmins));
adminRoutes.post(
  '/sub-admins',
  validate({ body: subAdminCreateSchema }),
  asyncHandler(authController.createSubSuperAdmin),
);
adminRoutes.delete('/sub-admins/:id', asyncHandler(authController.deleteSubSuperAdmin));

export const adminRouter = adminRoutes;
