import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { MovementType, ProductCategory } from '@prisma/client';
import { adminInventoryRepository } from '../src/modules/admin/inventory/adminInventory.repository';

describe('Super Admin Inventory & Product Catalog Endpoints (/api/v1/admin/inventory/*)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_inv_test_1',
    email: 'superadmin_inv@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'regular_cust_inv_1',
    email: 'regular_cust_inv@fioner.test',
    isSuperAdmin: false,
  });

  const mockWarehouse = {
    id: 'wh_test_1',
    name: 'Indore DC',
    code: 'IND-DC',
    address: 'Warehouse Lane',
    city: 'Indore',
    state: 'Madhya Pradesh',
    postalCode: '452001',
    isActive: true,
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
  };

  const mockProduct = {
    id: 'prd_test_1',
    name: 'SafeTag QR Sticker — Standard',
    sku: 'QR-STD-01',
    category: ProductCategory.QR,
    price: 349,
    lowStockThreshold: 25,
    isActive: true,
    description: 'High visibility vehicle QR sticker',
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
    stockItems: [
      {
        id: 'stk_test_1',
        productId: 'prd_test_1',
        warehouseId: 'wh_test_1',
        available: 100,
        reserved: 10,
        damaged: 2,
        dispatched: 50,
        returned: 1,
        warehouse: {
          id: 'wh_test_1',
          name: 'Indore DC',
          code: 'IND-DC',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(superAdminUser as never);
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);
    vi.spyOn(adminInventoryRepository, 'findWarehouseByName').mockResolvedValue(mockWarehouse as never);
    vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(mockWarehouse as never);

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return cb as never;
    });

    vi.spyOn(adminInventoryRepository, 'lockStockItem').mockImplementation(
      async (_productId, _warehouseId) => {
        return {
          id: 'stk_test_1',
          productId: 'prd_test_1',
          warehouseId: 'wh_test_1',
          available: 100,
          reserved: 10,
          damaged: 2,
          dispatched: 50,
          returned: 1,
        } as never;
      },
    );
  });

  describe('1. Security & Guard Enforcement', () => {
    it('returns 401 Unauthorized when no authentication token is provided', async () => {
      const res = await request(app).get('/api/v1/admin/inventory/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 Forbidden when accessed by a non-Super-Admin user', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'regular_cust_inv_1',
        email: 'regular_cust_inv@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/inventory/products')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows access to Super Admin users', async () => {
      vi.spyOn(adminInventoryRepository, 'listProducts').mockResolvedValueOnce({
        products: [],
        pagination: { page: 1, limit: 8, total: 0, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory/products')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Product Catalog Endpoints', () => {
    it('lists products with pagination and category filtering', async () => {
      vi.spyOn(adminInventoryRepository, 'listProducts').mockResolvedValueOnce({
        products: [
          {
            id: 'prd_test_1',
            name: 'SafeTag QR Sticker — Standard',
            sku: 'QR-STD-01',
            category: ProductCategory.QR,
            price: 349,
            available: 100,
            reserved: 10,
            damaged: 2,
            dispatched: 50,
            returned: 1,
            warehouse: 'Indore DC',
            lowStockThreshold: 25,
            isLowStock: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: { page: 1, limit: 8, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory/products?category=QR&page=1&limit=8')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].sku).toBe('QR-STD-01');
      expect(res.body.data[0].category).toBe('QR');
      expect(res.body.meta.pagination.total).toBe(1);
    });

    it('retrieves product detail by id', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValueOnce(
        mockProduct as never,
      );

      const res = await request(app)
        .get('/api/v1/admin/inventory/products/prd_test_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('prd_test_1');
      expect(res.body.data.name).toBe('SafeTag QR Sticker — Standard');
      expect(res.body.data.available).toBe(100);
    });

    it('returns 404 when product is not found', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/inventory/products/nonexistent_prd')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('creates a new product with initial stock and default warehouse', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductBySku').mockResolvedValueOnce(null);
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValueOnce(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'createProduct').mockResolvedValueOnce({
        id: 'prd_new_1',
        name: 'Rakshak GPS Tracker Pro',
        sku: 'GPS-PRO-01',
        category: ProductCategory.GPS,
        price: 3999,
        lowStockThreshold: 25,
        isActive: true,
        description: 'Pro vehicle tracker',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.spyOn(adminInventoryRepository, 'upsertStockItem').mockResolvedValueOnce({} as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValueOnce({} as never);

      const res = await request(app)
        .post('/api/v1/admin/inventory/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Rakshak GPS Tracker Pro',
          sku: 'GPS-PRO-01',
          category: 'GPS',
          price: 3999,
          available: 50,
          warehouse: 'Indore DC',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sku).toBe('GPS-PRO-01');
      expect(res.body.data.available).toBe(50);
      expect(adminInventoryRepository.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementType.PURCHASE,
          quantity: 50,
        }),
        expect.anything(),
      );
    });

    it('rejects product creation when SKU already exists with 409 Conflict', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductBySku').mockResolvedValueOnce(
        mockProduct as never,
      );

      const res = await request(app)
        .post('/api/v1/admin/inventory/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplicate Item',
          sku: 'QR-STD-01',
          category: 'QR',
          price: 299,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("SKU 'QR-STD-01' already exists");
    });

    it('updates an existing product', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValueOnce(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'updateProduct').mockResolvedValueOnce({
        ...mockProduct,
        price: 399,
      } as never);

      const res = await request(app)
        .put('/api/v1/admin/inventory/products/prd_test_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          price: 399,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(399);
    });
  });

  describe('3. Concurrency-Safe Stock Adjustments & Invariants', () => {
    it('successfully purchases/restocks additional units', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValueOnce(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValueOnce(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValueOnce({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValueOnce({
        id: 'stk_test_1',
        available: 150,
        reserved: 10,
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValueOnce({
        id: 'mov_1',
        type: MovementType.PURCHASE,
        quantity: 50,
      } as never);

      const res = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'PURCHASE',
          quantity: 50,
          reason: 'Supplier delivery batch #884',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({
          available: 150,
        }),
        expect.anything(),
      );
    });

    it('reserves available units and prevents over-reservation', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({
        id: 'stk_test_1',
        available: 70,
        reserved: 40,
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({
        id: 'mov_2',
        type: MovementType.RESERVATION,
      } as never);

      // 1. Valid reservation of 30 units (100 available)
      const validRes = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'RESERVATION',
          quantity: 30,
          reason: 'Order allocation',
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.success).toBe(true);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({
          available: 70,
          reserved: 40,
        }),
        expect.anything(),
      );

      // 2. Over-reservation attempt: trying to reserve 150 units when only 100 available
      const overRes = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'RESERVATION',
          quantity: 150,
          reason: 'Mass order attempt',
        });

      expect(overRes.status).toBe(400);
      expect(overRes.body.success).toBe(false);
      expect(overRes.body.error.message).toContain('Insufficient available stock (100) to reserve 150 units');
    });

    it('enforces non-negative invariants on stock damage and release', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);

      // Attempt to release 25 reserved units when only 10 are reserved
      const failRelease = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'RELEASE',
          quantity: 25,
          reason: 'Order cancellation',
        });

      expect(failRelease.status).toBe(400);
      expect(failRelease.body.error.message).toContain('Insufficient reserved stock (10) to release 25 units');

      // Attempt to mark 150 units damaged when only 100 available
      const failDamage = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DAMAGE',
          quantity: 150,
          reason: 'Water leak incident',
        });

      expect(failDamage.status).toBe(400);
      expect(failDamage.body.error.message).toContain('Insufficient available stock (100) to mark 150 units as damaged');
    });

    it('supports positive and negative stock reconciliation adjustments via ADJUSTMENT', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({
        id: 'stk_test_1',
        available: 85,
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({
        id: 'mov_adj',
        type: MovementType.ADJUSTMENT,
        quantity: -15,
      } as never);

      // Downward reconciliation: shrinkage of 15 units (from 100 available to 85)
      const downRes = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'ADJUSTMENT',
          quantity: -15,
          reason: 'Physical count audit reconciliation: 15 damaged/shrinkage',
        });

      expect(downRes.status).toBe(200);
      expect(downRes.body.success).toBe(true);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({ available: 85 }),
        expect.anything(),
      );

      // Rejects quantity: 0 for ADJUSTMENT
      const zeroRes = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'ADJUSTMENT',
          quantity: 0,
        });

      expect(zeroRes.status).toBe(400);
      expect(zeroRes.body.error.message).toBe('Validation failed');
      expect(zeroRes.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'Adjustment quantity cannot be zero' }),
        ]),
      );

      // Rejects negative adjustment exceeding available balance (-150 from 100)
      const overDownRes = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'ADJUSTMENT',
          quantity: -150,
          reason: 'Excessive downward adjustment',
        });

      expect(overDownRes.status).toBe(400);
      expect(overDownRes.body.error.message).toContain('Stock adjustment would result in negative available inventory (-50)');
    });

    it('handles deterministic DISPATCH from RESERVED vs AVAILABLE source', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({
        id: 'stk_test_1',
        reserved: 5,
        dispatched: 55,
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({
        id: 'mov_disp',
        type: MovementType.DISPATCH,
        quantity: 5,
      } as never);

      // Dispatch explicitly from RESERVED source (10 reserved, dispatch 5)
      const resDispatch = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 5,
          source: 'RESERVED',
          reason: 'Courier pickup dispatch',
        });

      expect(resDispatch.status).toBe(200);
      expect(resDispatch.body.success).toBe(true);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({ reserved: 5, dispatched: 55 }),
        expect.anything(),
      );

      // Attempt dispatch from RESERVED when reserved is insufficient (10 reserved, try 20)
      const failResDispatch = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 20,
          source: 'RESERVED',
        });

      expect(failResDispatch.status).toBe(400);
      expect(failResDispatch.body.error.message).toContain('Insufficient reserved stock (10) to dispatch 20 units');
    });

    it('handles DISPATCH from AVAILABLE source and rejects when available balance is insufficient', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({
        id: 'stk_test_1',
        available: 60,
        dispatched: 90,
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({
        id: 'mov_disp_avail',
        type: MovementType.DISPATCH,
        quantity: 40,
      } as never);

      // 1. Dispatch explicitly from AVAILABLE source (100 available, dispatch 40)
      const resDispatch = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 40,
          source: 'AVAILABLE',
          reason: 'Direct counter sale fulfillment',
        });

      expect(resDispatch.status).toBe(200);
      expect(resDispatch.body.success).toBe(true);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({ available: 60, dispatched: 90 }),
        expect.anything(),
      );

      // 2. Reject dispatch from AVAILABLE when available is insufficient (100 available, request 120)
      const failAvailDispatch = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 120,
          source: 'AVAILABLE',
        });

      expect(failAvailDispatch.status).toBe(400);
      expect(failAvailDispatch.body.error.message).toContain('Insufficient available stock (100) to dispatch 120 units');
    });

    it('handles DISPATCH with omitted source: prefers reserved, falls back to available, and rejects when neither has enough', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({
        id: 'mov_disp_omit',
        type: MovementType.DISPATCH,
      } as never);

      // 1. Omitted source: qty (8) <= reserved (10) -> draws from reserved
      const resReservedOmit = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 8,
          // source omitted
        });

      expect(resReservedOmit.status).toBe(200);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({ reserved: 2, dispatched: 58 }),
        expect.anything(),
      );

      // 2. Omitted source: qty (25) > reserved (10) but <= available (100) -> falls back to available
      const resAvailFallback = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 25,
          // source omitted
        });

      expect(resAvailFallback.status).toBe(200);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({ available: 75, dispatched: 75 }),
        expect.anything(),
      );

      // 3. Omitted source: qty (150) > reserved (10) and > available (100) -> rejects with 400
      const resNeither = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'DISPATCH',
          quantity: 150,
          // source omitted
        });

      expect(resNeither.status).toBe(400);
      expect(resNeither.body.error.message).toContain('Insufficient stock to dispatch 150 units (Available: 100, Reserved: 10)');
    });

    it('records RETURN movements: restores available sellable inventory and increments cumulative returned metric', async () => {
      vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(
        mockProduct as never,
      );
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
        id: 'stk_test_1',
      } as never);
      vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({
        id: 'stk_test_1',
        available: 105,
        returned: 6,
      } as never);
      vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({
        id: 'mov_return',
        type: MovementType.RETURN,
        quantity: 5,
      } as never);

      const res = await request(app)
        .post('/api/v1/admin/inventory/products/prd_test_1/adjust')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'RETURN',
          quantity: 5,
          reason: 'Customer return: order cancelled post-dispatch, restocked',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(adminInventoryRepository.updateStockItem).toHaveBeenCalledWith(
        'stk_test_1',
        expect.objectContaining({
          available: 105, // 100 + 5 restocked into sellable
          returned: 6,    // 1 + 5 cumulative returns incremented
        }),
        expect.anything(),
      );
      expect(adminInventoryRepository.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MovementType.RETURN,
          quantity: 5,
          previousAvailable: 100,
          newAvailable: 105,
        }),
        expect.anything(),
      );
    });
  });

  describe('4. Warehouse Management & Referential Integrity', () => {
    it('lists warehouses with stored SKU counts and available units', async () => {
      vi.spyOn(adminInventoryRepository, 'listWarehouses').mockResolvedValueOnce([
        {
          id: 'wh_test_1',
          name: 'Indore DC',
          code: 'IND-DC',
          address: 'Warehouse Lane',
          city: 'Indore',
          state: 'Madhya Pradesh',
          postalCode: '452001',
          isActive: true,
          skusStored: 5,
          unitsAvailable: 420,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/inventory/warehouses')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe('Indore DC');
      expect(res.body.data[0].skusStored).toBe(5);
      expect(res.body.data[0].unitsAvailable).toBe(420);
    });

    it('creates a new warehouse', async () => {
      vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValueOnce(null);
      vi.spyOn(adminInventoryRepository, 'findWarehouseByName').mockResolvedValueOnce(null);
      vi.spyOn(adminInventoryRepository, 'createWarehouse').mockResolvedValueOnce({
        id: 'wh_new_blr',
        name: 'Bengaluru DC',
        code: 'BLR-DC',
        city: 'Bengaluru',
        state: 'Karnataka',
        isActive: true,
      } as never);

      const res = await request(app)
        .post('/api/v1/admin/inventory/warehouses')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Bengaluru DC',
          code: 'BLR-DC',
          city: 'Bengaluru',
          state: 'Karnataka',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('BLR-DC');
    });

    it('prevents deletion of warehouse with dependent stock items (Referential Integrity)', async () => {
      vi.spyOn(adminInventoryRepository, 'findWarehouseById').mockResolvedValueOnce(
        mockWarehouse as never,
      );
      vi.spyOn(adminInventoryRepository, 'countStockItemsByWarehouse').mockResolvedValueOnce(3);

      const res = await request(app)
        .delete('/api/v1/admin/inventory/warehouses/wh_test_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot delete warehouse: warehouse has dependent stock item records');
    });
  });

  describe('5. Stock Dashboard & Low-Stock Alerts', () => {
    it('returns stock dashboard metrics and alerts for low stock threshold (< 25)', async () => {
      vi.spyOn(adminInventoryRepository, 'getStockDashboard').mockResolvedValueOnce({
        totalAvailable: 850,
        totalReserved: 45,
        totalDamaged: 8,
        totalDispatched: 520,
        totalReturned: 12,
        lowStockCount: 2,
        lowStockAlerts: [
          {
            id: 'prd_low_1',
            name: 'Emergency Window Sticker Kit',
            sku: 'EMG-WSK',
            category: ProductCategory.ACCESSORY,
            available: 8,
            lowStockThreshold: 25,
            warehouse: 'Indore DC',
          },
          {
            id: 'prd_low_2',
            name: 'Rakshak Dashcam D1',
            sku: 'DASH-D1',
            category: ProductCategory.HARDWARE,
            available: 19,
            lowStockThreshold: 25,
            warehouse: 'Pune DC',
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory/stock-dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAvailable).toBe(850);
      expect(res.body.data.lowStockCount).toBe(2);
      expect(res.body.data.lowStockAlerts).toHaveLength(2);
      expect(res.body.data.lowStockAlerts[0].sku).toBe('EMG-WSK');
    });
  });

  describe('6. Serial / IMEI Records', () => {
    it('returns serial and IMEI records mapped with vehicle links', async () => {
      vi.spyOn(adminInventoryRepository, 'listSerials').mockResolvedValueOnce({
        items: [
          {
            id: 'gps_1',
            sn: '861234567890123',
            serialNumber: 'SN-001',
            type: 'GPS device',
            status: 'ACTIVE',
            link: 'MH12AB1234',
            createdAt: new Date(),
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory/serial-imei?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].sn).toBe('861234567890123');
      expect(res.body.data[0].link).toBe('MH12AB1234');
    });
  });

  describe('7. Inventory Movements Audit History', () => {
    it('lists recorded inventory movements with filtering', async () => {
      vi.spyOn(adminInventoryRepository, 'listMovements').mockResolvedValueOnce({
        movements: [
          {
            id: 'mov_1',
            productId: 'prd_test_1',
            warehouseId: 'wh_test_1',
            type: MovementType.PURCHASE,
            quantity: 100,
            previousAvailable: 0,
            newAvailable: 100,
            previousReserved: 0,
            newReserved: 0,
            reason: 'Initial intake',
            notes: null,
            referenceType: 'PRODUCT_CREATION',
            referenceId: 'prd_test_1',
            actorId: 'admin_1',
            actorEmail: 'admin@fioner.test',
            createdAt: new Date(),
            product: { id: 'prd_test_1', name: 'SafeTag QR Sticker', sku: 'QR-STD-01' },
            warehouse: { id: 'wh_test_1', name: 'Indore DC', code: 'IND-DC' },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get('/api/v1/admin/inventory/movements?productId=prd_test_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('PURCHASE');
      expect(res.body.data[0].product.sku).toBe('QR-STD-01');
    });
  });
});
