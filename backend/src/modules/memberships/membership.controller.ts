import type { Request, Response } from 'express';
import { ApiResponse } from '../../common/utils/apiResponse';
import { membershipService } from './membership.service';
import type {
  SubscribeInput,
} from './membership.schema';

export const membershipController = {
  async listPlans(_req: Request, res: Response) {
    const plans = await membershipService.listActivePlans();
    return ApiResponse.ok(res, plans);
  },

  async getCurrentSubscription(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const result = await membershipService.getCurrentSubscription(userId);
    return ApiResponse.ok(res, result);
  },

  async getEffectiveEntitlements(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const entitlements = await membershipService.getEffectiveEntitlements(userId);
    return ApiResponse.ok(res, entitlements);
  },

  async createCheckout(_req: Request, res: Response) {
    const result = await membershipService.createCheckout();
    return ApiResponse.ok(res, result);
  },

  async subscribe(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const body = req.body as SubscribeInput;
    const subscription = await membershipService.subscribe(userId, body.planId || body.planSlug || '');
    return ApiResponse.ok(res, subscription);
  },

  async updatePreferences(_req: Request, res: Response) {
    const result = await membershipService.updatePreferences();
    return ApiResponse.ok(res, result);
  },

  async cancelSubscription(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const result = await membershipService.cancelSubscription(userId);
    return ApiResponse.ok(res, result);
  },

  async getHistory(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const history = await membershipService.getHistory(userId);
    return ApiResponse.ok(res, history);
  },
};
