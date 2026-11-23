import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminOrdersService } from './adminOrders.service';
import type {
  ListOrdersQueryInput,
  UpdateOrderStatusInput,
} from './adminOrders.schema';

export const adminOrdersController = {
  async listOrders(req: Request, res: Response) {
    const query = req.query as unknown as ListOrdersQueryInput;
    const result = await adminOrdersService.listOrders(query);
    return ApiResponse.ok(res, result.orders, {
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.page < result.pagination.totalPages,
        hasPreviousPage: result.pagination.page > 1,
      },
    });
  },

  async getOrderStats(_req: Request, res: Response) {
    const stats = await adminOrdersService.getOrderStats();
    return ApiResponse.ok(res, stats);
  },

  async getOrderById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const order = await adminOrdersService.getOrderById(id);
    return ApiResponse.ok(res, order);
  },

  async updateOrderStatus(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as UpdateOrderStatusInput;
    const actorId = req.auth.userId;
    const actorEmail = req.auth.email;
    const order = await adminOrdersService.updateOrderStatus(
      id,
      input,
      actorId,
      actorEmail,
      req.ip,
    );
    return ApiResponse.ok(res, order);
  },

  async processRefund(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const actorId = req.auth.userId;
    const actorEmail = req.auth.email;
    const result = await adminOrdersService.processRefund(
      id,
      req.body || {},
      actorId,
      actorEmail,
      req.ip,
    );
    return ApiResponse.ok(res, result);
  },

  async addOrderNote(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const text = req.body?.text || req.body?.note || '';
    if (!text) throw ApiError.badRequest('Note text is required');
    const actorId = req.auth.userId;
    const actorEmail = req.auth.email;
    const note = await adminOrdersService.addOrderNote(
      id,
      { text },
      actorId,
      actorEmail,
      req.ip,
    );
    return ApiResponse.created(res, note);
  },

  async shipViaShiprocket(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const actorId = req.auth.userId;
    const actorEmail = req.auth.email;
    const result = await adminOrdersService.shipViaShiprocket(
      id,
      req.body || {},
      actorId,
      actorEmail,
      req.ip,
    );
    return ApiResponse.ok(res, result);
  },

  async getShippingLabel(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const html = await adminOrdersService.generateShippingLabelHtml(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  },
};
