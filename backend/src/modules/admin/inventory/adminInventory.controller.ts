import type { Request, Response } from 'express';
import { ApiError } from '../../../common/utils/apiError';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminInventoryService } from './adminInventory.service';
import type {
  CreateProductInput,
  ListProductsQueryInput,
  ToggleStockInput,
  UpdateProductInput,
} from './adminInventory.schema';

export const adminInventoryController = {
  async listProducts(req: Request, res: Response) {
    const query = req.query as unknown as ListProductsQueryInput;
    const result = await adminInventoryService.listProducts(query);
    return ApiResponse.ok(res, result.products, {
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

  async getProductById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminInventoryService.getProductById(id);
    return ApiResponse.ok(res, result);
  },

  async createProduct(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const input = req.body as CreateProductInput;
    const actorId = req.auth.userId;
    const result = await adminInventoryService.createProduct(input, actorId, req.ip);
    return ApiResponse.created(res, result);
  },

  async updateProduct(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = req.body as UpdateProductInput;
    const actorId = req.auth.userId;
    const result = await adminInventoryService.updateProduct(id, input, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async deleteProduct(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const actorId = req.auth.userId;
    const result = await adminInventoryService.deleteProduct(id, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async toggleStock(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const input = (req.body || {}) as ToggleStockInput;
    const actorId = req.auth.userId;
    const result = await adminInventoryService.toggleStock(id, input.inStock, actorId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async adjustStock(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const actorId = req.auth.userId;
    const result = await adminInventoryService.adjustStock(id, req.body, actorId, req.auth.email, req.ip);
    return ApiResponse.ok(res, result);
  },

  async getStockDashboard(_req: Request, res: Response) {
    const result = await adminInventoryService.getStockDashboard();
    return ApiResponse.ok(res, result);
  },

  async listWarehouses(_req: Request, res: Response) {
    const result = await adminInventoryService.listWarehouses();
    return ApiResponse.ok(res, result);
  },

  async getWarehouseById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminInventoryService.getWarehouseById(id);
    return ApiResponse.ok(res, result);
  },

  async createWarehouse(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await adminInventoryService.createWarehouse(req.body, req.auth.userId, req.ip);
    return ApiResponse.created(res, result);
  },

  async updateWarehouse(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const result = await adminInventoryService.updateWarehouse(id, req.body, req.auth.userId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async deleteWarehouse(req: Request, res: Response) {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = req.params as { id: string };
    const result = await adminInventoryService.deleteWarehouse(id, req.auth.userId, req.ip);
    return ApiResponse.ok(res, result);
  },

  async listMovements(req: Request, res: Response) {
    const result = await adminInventoryService.listMovements(req.query);
    return ApiResponse.ok(res, result.movements, {
      pagination: result.pagination,
    });
  },

  async listSerials(req: Request, res: Response) {
    const result = await adminInventoryService.listSerials(req.query);
    return ApiResponse.ok(res, result.items, {
      pagination: result.pagination,
    });
  },

  async getProductSerials(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const result = await adminInventoryService.getProductSerials(id);
    return ApiResponse.ok(res, result);
  },

  async addProductSerials(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const units = req.body?.serials || req.body?.units || (Array.isArray(req.body) ? req.body : []);
    const result = await adminInventoryService.addProductSerials(id, units, req.auth?.userId, req.ip);
    return ApiResponse.ok(res, result);
  },
};
