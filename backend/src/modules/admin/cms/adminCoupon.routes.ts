import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { couponService } from './coupon.service';

export const adminCouponRoutes = Router();

adminCouponRoutes.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { search, status } = req.query as { search?: string; status?: string };
    const items = await couponService.listAll({ search, status });
    return ApiResponse.ok(res, { items, data: items, total: items.length });
  }),
);

adminCouponRoutes.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const coupon = await couponService.create(req.body);
    return ApiResponse.created(res, coupon);
  }),
);

adminCouponRoutes.patch(
  '/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updated = await couponService.toggleStatus(id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    return ApiResponse.ok(res, updated);
  }),
);

adminCouponRoutes.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await couponService.delete(id);
    return ApiResponse.ok(res, { deleted: true, id });
  }),
);
