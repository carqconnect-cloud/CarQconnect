import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminMembershipService } from './adminMembership.service';
import type {
  CreatePlanInput,
  ListSubscriptionsQueryInput,
  RenewalsQueryInput,
  UpdatePlanInput,
  UpdateSubscriptionStatusInput,
} from './adminMembership.schema';

export const adminMembershipController = {
  async listPlans(_req: Request, res: Response) {
    const plans = await adminMembershipService.listPlans();
    return ApiResponse.ok(res, plans);
  },

  async getPlanById(req: Request, res: Response) {
    const id = req.params.id as string;
    const plan = await adminMembershipService.getPlanById(id);
    return ApiResponse.ok(res, plan);
  },

  async createPlan(req: Request, res: Response) {
    const body = req.body as CreatePlanInput;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const plan = await adminMembershipService.createPlan(body, actorId, actorEmail);
    return ApiResponse.created(res, plan);
  },

  async updatePlan(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdatePlanInput;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const plan = await adminMembershipService.updatePlan(id, body, actorId, actorEmail);
    return ApiResponse.ok(res, plan);
  },

  async deletePlan(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const result = await adminMembershipService.deletePlan(id, actorId, actorEmail);
    return ApiResponse.ok(res, result);
  },

  async listSubscriptions(req: Request, res: Response) {
    const query = req.query as unknown as ListSubscriptionsQueryInput;
    const result = await adminMembershipService.listSubscriptions(query);
    return ApiResponse.ok(res, result);
  },

  async getSubscriptionById(req: Request, res: Response) {
    const id = req.params.id as string;
    const sub = await adminMembershipService.getSubscriptionById(id);
    return ApiResponse.ok(res, sub);
  },

  async updateSubscriptionStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateSubscriptionStatusInput;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const sub = await adminMembershipService.updateSubscriptionStatus(
      id,
      body,
      actorId,
      actorEmail,
    );
    return ApiResponse.ok(res, sub);
  },

  async listRenewals(req: Request, res: Response) {
    const query = req.query as unknown as RenewalsQueryInput;
    const days = query.days || 15;
    const renewals = await adminMembershipService.listRenewals(days);
    return ApiResponse.ok(res, renewals);
  },

  async recordReminder(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const actorEmail = req.auth?.email;

    const result = await adminMembershipService.recordReminder(id, actorId, actorEmail);
    return ApiResponse.ok(res, result);
  },
};
