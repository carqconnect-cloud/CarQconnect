import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { MovementType, OrderStatus, PaymentStatus, ProductCategory, RefundStatus } from '@prisma/client';
import { adminInventoryRepository } from '../src/modules/admin/inventory/adminInventory.repository';
import { razorpayClient } from '../src/modules/payment/razorpay.client';

describe('Orders Module (Phase 3E.2)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_order_test_1',
    email: 'superadmin_order@fioner.test',
    firstName: 'Super',
    lastName: 'Admin',
    isSuperAdmin: true,
    isActive: true,
  };

  const customerUser1 = {
    id: 'cust_order_test_1',
    email: 'customer1@fioner.test',
    firstName: 'Aarav',
    lastName: 'Sharma',
    phone: '+919876543210',
    isSuperAdmin: false,
    isActive: true,
  };

  const customerUser2 = {
    id: 'cust_order_test_2',
    email: 'customer2@fioner.test',
    firstName: 'Rohan',
    lastName: 'Verma',
    phone: '+919876543211',
    isSuperAdmin: false,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const customer1Token = signAccessToken({
    sub: customerUser1.id,
    email: customerUser1.email,
    isSuperAdmin: false,
  });

  const customer2Token = signAccessToken({
    sub: customerUser2.id,
    email: customerUser2.email,
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
    id: 'prd_order_1',
    name: 'SafeTag QR Sticker — Standard',
    sku: 'QR-STD-01',
    category: ProductCategory.QR,
    price: 349,
    lowStockThreshold: 25,
    isActive: true,
    description: 'High visibility vehicle QR sticker',
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
  };

  const mockOrder = {
    id: 'ord_test_1',
    orderNo: 'FR-100001',
    userId: customerUser1.id,
    customerName: 'Aarav Sharma',
    customerEmail: 'customer1@fioner.test',
    customerPhone: '+919876543210',
    shippingAddress: { city: 'Indore', state: 'MP', pincode: '452001' },
    status: OrderStatus.PLACED,
    payStatus: PaymentStatus.PENDING,
    amount: 698,
    currency: 'INR',
    awb: null,
    placedAt: new Date('2026-10-15T10:00:00Z'),
    confirmedAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    returnedAt: null,
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
    items: [
      {
        id: 'ord_item_1',
        orderId: 'ord_test_1',
        productId: mockProduct.id,
        productName: mockProduct.name,
        sku: mockProduct.sku,
        unitPrice: 349,
        quantity: 2,
        totalPrice: 698,
        warehouseId: mockWarehouse.id,
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-15T10:00:00Z'),
      },
    ],
    notes: [
      {
        id: 'note_1',
        orderId: 'ord_test_1',
        actorId: superAdminUser.id,
        actorEmail: superAdminUser.email,
        text: 'Priority delivery requested',
        createdAt: new Date('2026-10-15T10:05:00Z'),
      },
    ],
    activities: [
      {
        id: 'act_1',
        orderId: 'ord_test_1',
        status: OrderStatus.PLACED,
        title: 'Order Created',
        description: 'Order created with 1 item(s)',
        actorId: superAdminUser.id,
        actorEmail: superAdminUser.email,
        createdAt: new Date('2026-10-15T10:00:00Z'),
      },
    ],
  };

  beforeEach(() => {
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(
      (async (args: unknown) => {
        const query = args as { where: { id?: string; email?: string } };
        const id = query?.where?.id;
        if (id === customerUser1.id) return customerUser1 as never;
        if (id === customerUser2.id) return customerUser2 as never;
        return superAdminUser as never;
      }) as unknown as typeof prisma.user.findUnique,
    );

    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as never);
    vi.spyOn(adminInventoryRepository, 'findWarehouseByName').mockResolvedValue(mockWarehouse as never);
    vi.spyOn(adminInventoryRepository, 'findWarehouseByCode').mockResolvedValue(mockWarehouse as never);
    vi.spyOn(adminInventoryRepository, 'findWarehouseById').mockResolvedValue(mockWarehouse as never);
    vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue(mockProduct as never);

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return cb as never;
    });

    vi.spyOn(adminInventoryRepository, 'findStockItem').mockResolvedValue({
      id: 'stk_test_1',
      productId: mockProduct.id,
      warehouseId: mockWarehouse.id,
      available: 50,
      reserved: 5,
      damaged: 0,
      dispatched: 10,
      returned: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(adminInventoryRepository, 'lockStockItem').mockResolvedValue({
      id: 'stk_test_1',
      productId: mockProduct.id,
      warehouseId: mockWarehouse.id,
      available: 50,
      reserved: 5,
      damaged: 0,
      dispatched: 10,
      returned: 0,
    } as never);

    vi.spyOn(adminInventoryRepository, 'updateStockItem').mockResolvedValue({} as never);
    vi.spyOn(adminInventoryRepository, 'createMovement').mockResolvedValue({} as never);
    vi.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder as never);
    vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as never);
    vi.spyOn(prisma.orderNote, 'create').mockResolvedValue({} as never);
    vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

    if (prisma.orderRefund) {
      vi.spyOn(prisma.orderRefund, 'findFirst').mockResolvedValue(null as never);
      vi.spyOn(prisma.orderRefund, 'create').mockResolvedValue({
        id: 'rfnd_rec_1',
        orderId: mockOrder.id,
        amount: mockOrder.amount,
        currency: 'INR',
        status: RefundStatus.REQUESTED,
        reason: 'Refund test',
        idempotencyKey: 'idemp_key_1',
        paymentId: 'pay_123',
        gatewayRefundId: null,
        failureReason: null,
        requestedAt: new Date(),
        processedAt: null,
        failedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      vi.spyOn(prisma.orderRefund, 'update').mockResolvedValue({} as never);
    }

    razorpayClient.setAdapter(null);
  });

  describe('Super Admin Orders Endpoints (/api/v1/admin/orders/*)', () => {
    describe('1. Security & Guard Enforcement', () => {
      it('returns 401 Unauthorized when no authentication token is provided', async () => {
        const res = await request(app).get('/api/v1/admin/orders');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });

      it('returns 403 Forbidden when accessed by a non-Super-Admin user', async () => {
        const res = await request(app)
          .get('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${customer1Token}`);
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      });
    });

    describe('2. List Orders & Stats', () => {
      it('lists orders with pagination and filters', async () => {
        vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
        vi.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as never);

        const res = await request(app)
          .get('/api/v1/admin/orders?page=1&limit=10&status=PLACED&payStatus=PENDING')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].orderNo).toBe('FR-100001');
        expect(res.body.data[0].product).toBe('SafeTag QR Sticker — Standard');
        expect(res.body.data[0].qty).toBe(2);
        expect(res.body.meta.pagination.total).toBe(1);
      });

      it('returns order stats including revenue and counts', async () => {
        vi.spyOn(prisma.order, 'count').mockResolvedValue(42);
        vi.spyOn(prisma.order, 'aggregate').mockResolvedValue({
          _sum: { amount: 28450 },
        } as never);

        const res = await request(app)
          .get('/api/v1/admin/orders/stats')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.total).toBe(42);
        expect(res.body.data.revenue).toBe(28450);
        expect(res.body.data.byStatus).toBeDefined();
        expect(res.body.data.byPayStatus).toBeDefined();
      });

      it('gets order by id with notes and activity timeline', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as never);

        const res = await request(app)
          .get('/api/v1/admin/orders/ord_test_1')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe('ord_test_1');
        expect(res.body.data.notes).toHaveLength(1);
        expect(res.body.data.activities).toHaveLength(1);
      });

      it('returns 404 Not Found when order does not exist', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

        const res = await request(app)
          .get('/api/v1/admin/orders/ord_nonexistent')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });

    describe('3. Create Order & Stock Reservation', () => {
      it('creates an admin order, reserves stock atomically, and records audit log', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'create').mockResolvedValue({
          ...mockOrder,
          id: 'ord_created_1',
          orderNo: 'FR-999999',
        } as never);

        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          id: 'ord_created_1',
          orderNo: 'FR-999999',
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            userId: customerUser1.id,
            customerName: 'Aarav Sharma',
            customerEmail: 'customer1@fioner.test',
            items: [{ productId: mockProduct.id, quantity: 2 }],
            payStatus: 'PAID',
            notes: 'Test order from admin',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { available: 48, reserved: 7 },
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RESERVATION,
            quantity: 2,
            productId: mockProduct.id,
          }),
          expect.anything(),
        );
      });

      it('rejects order creation when stock is insufficient', async () => {
        vi.spyOn(adminInventoryRepository, 'lockStockItem').mockResolvedValue({
          id: 'stk_test_1',
          productId: mockProduct.id,
          warehouseId: mockWarehouse.id,
          available: 1, // Only 1 available
          reserved: 5,
          damaged: 0,
          dispatched: 10,
          returned: 0,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            userId: customerUser1.id,
            items: [{ productId: mockProduct.id, quantity: 10 }], // Requesting 10
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Insufficient available stock');
      });

      it('rejects order creation when product is inactive', async () => {
        vi.spyOn(adminInventoryRepository, 'findProductById').mockResolvedValue({
          ...mockProduct,
          isActive: false,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            userId: customerUser1.id,
            items: [{ productId: mockProduct.id, quantity: 1 }],
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('is inactive');
      });

      it('consolidates duplicate product lines targeting same warehouse into a single reservation', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'create').mockResolvedValue({
          ...mockOrder,
          id: 'ord_created_dup',
          orderNo: 'FR-999998',
        } as never);

        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          id: 'ord_created_dup',
          orderNo: 'FR-999998',
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            userId: customerUser1.id,
            items: [
              { productId: mockProduct.id, quantity: 2 },
              { productId: mockProduct.id, quantity: 3 },
            ],
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(updateStockSpy).toHaveBeenCalledTimes(1);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { available: 45, reserved: 10 }, // 2 + 3 = 5 reserved
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RESERVATION,
            quantity: 5,
            productId: mockProduct.id,
          }),
          expect.anything(),
        );
      });
    });

    describe('4. Order Lifecycle Transitions & Inventory Integration', () => {
      it('transitions PLACED -> CONFIRMED successfully', async () => {
        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce(mockOrder as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CONFIRMED,
          } as never);
        vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

        const res = await request(app)
          .patch('/api/v1/admin/orders/ord_test_1/status')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ status: 'CONFIRMED' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(OrderStatus.CONFIRMED);
      });

      it('transitions CONFIRMED -> SHIPPED, dispatches from reserved stock, and assigns AWB', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CONFIRMED,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.SHIPPED,
            awb: 'AWB987654321',
          } as never);
        vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

        const res = await request(app)
          .patch('/api/v1/admin/orders/ord_test_1/status')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ status: 'SHIPPED', awb: 'AWB987654321' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(OrderStatus.SHIPPED);
        expect(res.body.data.awb).toBe('AWB987654321');
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { reserved: 3, dispatched: 12 }, // reserved 5 - 2 = 3, dispatched 10 + 2 = 12
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.DISPATCH,
            quantity: 2,
          }),
          expect.anything(),
        );
      });

      it('transitions SHIPPED -> RETURNED and restocks available inventory', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.SHIPPED,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.RETURNED,
          } as never);
        vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

        const res = await request(app)
          .patch('/api/v1/admin/orders/ord_test_1/status')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ status: 'RETURNED', reason: 'Customer returned item' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(OrderStatus.RETURNED);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { returned: 2, available: 52 }, // returned 0 + 2, available 50 + 2
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RETURN,
            quantity: 2,
          }),
          expect.anything(),
        );
      });

      it('cancels an order, releases reserved stock back to available, and preserves payment status without false auto-refund', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CONFIRMED,
            payStatus: PaymentStatus.PAID,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CANCELLED,
            payStatus: PaymentStatus.PAID, // Truthful: cancellation does NOT auto-refund
            cancelledAt: new Date(),
          } as never);
        vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

        const res = await request(app)
          .patch('/api/v1/admin/orders/ord_test_1/status')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ status: 'CANCELLED', reason: 'Customer cancellation' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(OrderStatus.CANCELLED);
        expect(res.body.data.payStatus).toBe(PaymentStatus.PAID);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { reserved: 3, available: 52 }, // released 2 units from reserved to available
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RELEASE,
            quantity: 2,
          }),
          expect.anything(),
        );
      });

      it('rejects invalid status transition (PLACED -> DELIVERED)', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as never);

        const res = await request(app)
          .patch('/api/v1/admin/orders/ord_test_1/status')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ status: 'DELIVERED' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Invalid order status transition');
      });

      it('rejects transition from terminal state (CANCELLED -> CONFIRMED)', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
        } as never);

        const res = await request(app)
          .patch('/api/v1/admin/orders/ord_test_1/status')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ status: 'CONFIRMED' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Invalid order status transition');
      });
    });

    describe('5. Truthful Refund Lifecycle and Notes', () => {
      it('initiates refund on a returned order: marks order REFUND_PENDING (never REFUNDED) awaiting webhook confirmation', async () => {
        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.RETURNED,
            payStatus: PaymentStatus.PAID,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.RETURNED,
            payStatus: PaymentStatus.PAID,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.RETURNED,
            payStatus: PaymentStatus.REFUND_PENDING,
            refundId: 'rfnd_test_gateway_1',
          } as never);
        vi.spyOn(prisma.order, 'update').mockResolvedValue(mockOrder as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Item returned in intact condition' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.payStatus).toBe(PaymentStatus.REFUND_PENDING);
        expect(res.body.data.refundId).toBeDefined();
      });

      it('idempotently returns order without executing a second refund if already REFUNDED', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.RETURNED,
          payStatus: PaymentStatus.REFUNDED,
          refundId: 'rfnd_already_completed',
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Duplicate refund request' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.payStatus).toBe(PaymentStatus.REFUNDED);
      });

      it('rejects duplicate refund when order is already REFUND_PENDING', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
          payStatus: PaymentStatus.REFUND_PENDING,
        } as never);
        vi.spyOn(prisma.orderRefund, 'findFirst').mockResolvedValue({
          id: 'rfnd_existing_in_flight',
          status: RefundStatus.PENDING,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Retry while in flight' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Refund is already in progress');
      });

      it('rejects partial refund explicitly per approved contract', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
          payStatus: PaymentStatus.PAID,
          amount: 698,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ amount: 349, reason: 'Attempting partial refund' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Partial refunds are not supported');
      });

      it('rejects zero or negative refund amount', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
          payStatus: PaymentStatus.PAID,
          amount: 698,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ amount: 0 });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('greater than zero');
      });

      it('rejects refund on an order whose payment is PENDING or FAILED', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
          payStatus: PaymentStatus.PENDING,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Attempting to refund unpaid order' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Only \'PAID\' orders can be refunded');
      });

      it('rejects refund when refund amount exceeds total order amount', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
          payStatus: PaymentStatus.PAID,
          amount: 698,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ amount: 1500, reason: 'Excess refund amount' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('cannot exceed order total amount');
      });

      it('rejects refund on an active PLACED or CONFIRMED order', async () => {
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CONFIRMED,
        } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Premature refund' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Refund can only be processed');
      });

      it('handles gateway failure by reverting payStatus to PAID and recording failure', async () => {
        razorpayClient.setAdapter(async () => {
          throw new Error('Gateway payment authorization cancelled');
        });

        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CANCELLED,
            payStatus: PaymentStatus.PAID,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CANCELLED,
            payStatus: PaymentStatus.PAID,
          } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Customer refund' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Payment gateway rejected refund');
      });

      it('handles gateway timeout without reverting to PAID, keeping REFUND_PENDING', async () => {
        razorpayClient.setAdapter(async () => {
          const timeoutErr = new Error('Gateway timeout after 10000ms');
          timeoutErr.name = 'AbortError';
          throw timeoutErr;
        });

        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CANCELLED,
            payStatus: PaymentStatus.PAID,
          } as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            status: OrderStatus.CANCELLED,
            payStatus: PaymentStatus.PAID,
          } as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/refund')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ reason: 'Customer refund' });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('marked REFUND_PENDING');
      });

      it('in production mode with missing credentials, rejects refund safely without generating mock IDs', async () => {
        const prevEnv = process.env.NODE_ENV;
        const prevKey = process.env.RAZORPAY_KEY_ID;
        const prevSecret = process.env.RAZORPAY_KEY_SECRET;

        try {
          process.env.NODE_ENV = 'production';
          delete process.env.RAZORPAY_KEY_ID;
          delete process.env.RAZORPAY_KEY_SECRET;

          vi.spyOn(prisma.order, 'findUnique')
            .mockResolvedValueOnce({
              ...mockOrder,
              status: OrderStatus.CANCELLED,
              payStatus: PaymentStatus.PAID,
            } as never)
            .mockResolvedValueOnce({
              ...mockOrder,
              status: OrderStatus.CANCELLED,
              payStatus: PaymentStatus.PAID,
            } as never);

          const res = await request(app)
            .post('/api/v1/admin/orders/ord_test_1/refund')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ reason: 'Production credential failure' });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.error.message).toContain('credentials are not configured');
        } finally {
          process.env.NODE_ENV = prevEnv;
          if (prevKey) process.env.RAZORPAY_KEY_ID = prevKey;
          if (prevSecret) process.env.RAZORPAY_KEY_SECRET = prevSecret;
        }
      });

      it('in test mode without credentials, simulates safe pending refund with deterministic ID', async () => {
        const prevKey = process.env.RAZORPAY_KEY_ID;
        const prevSecret = process.env.RAZORPAY_KEY_SECRET;

        try {
          delete process.env.RAZORPAY_KEY_ID;
          delete process.env.RAZORPAY_KEY_SECRET;

          const res = await razorpayClient.createRefund({
            paymentId: 'pay_test_deterministic_1',
            amountInRupees: 698,
            reason: 'Test refund',
            idempotencyKey: 'key_det_1',
          });

          expect(res.id).toMatch(/^rfnd_/);
          expect(res.status).toBe('pending');
          expect(res.amount).toBe(69800); // 698 INR in paise
          expect(res.currency).toBe('INR');
        } finally {
          if (prevKey) process.env.RAZORPAY_KEY_ID = prevKey;
          if (prevSecret) process.env.RAZORPAY_KEY_SECRET = prevSecret;
        }
      });

      it('preserves exact monetary precision in paise for decimal amounts without float drift', async () => {
        const res = await razorpayClient.createRefund({
          paymentId: 'pay_precision_test',
          amountInRupees: 349.99,
          reason: 'Decimal precision test',
          idempotencyKey: 'key_prec_1',
        });

        expect(res.amount).toBe(34999); // Exactly 34999 paise without float rounding drift
      });

      it('adds an internal note to an order', async () => {
        vi.spyOn(prisma.order, 'findUnique')
          .mockResolvedValueOnce(mockOrder as never)
          .mockResolvedValueOnce({
            ...mockOrder,
            notes: [
              {
                id: 'note_2',
                orderId: mockOrder.id,
                actorId: superAdminUser.id,
                actorEmail: superAdminUser.email,
                text: 'Verified customer address via phone',
                createdAt: new Date(),
              },
            ],
          } as never);
        vi.spyOn(prisma.orderNote, 'create').mockResolvedValue({} as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);

        const res = await request(app)
          .post('/api/v1/admin/orders/ord_test_1/notes')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ text: 'Verified customer address via phone' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.notes).toHaveLength(1);
      });
    });
  });

  describe('Customer Orders Endpoints (/api/v1/orders/*)', () => {
    describe('1. Security & Authentication', () => {
      it('returns 401 Unauthorized when unauthenticated', async () => {
        const res = await request(app).get('/api/v1/orders');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      });
    });

    describe('2. Customer Order Placement', () => {
      it('creates customer order and reserves stock atomically', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'create').mockResolvedValue({
          ...mockOrder,
          id: 'ord_cust_1',
          orderNo: 'FR-888888',
        } as never);

        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          id: 'ord_cust_1',
          orderNo: 'FR-888888',
        } as never);

        const res = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${customer1Token}`)
          .send({
            items: [{ productId: mockProduct.id, quantity: 2 }],
            shippingAddress: { city: 'Indore', address: 'MG Road' },
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { available: 48, reserved: 7 },
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RESERVATION,
            quantity: 2,
          }),
          expect.anything(),
        );
      });

      it('consolidates duplicate product lines in customer order placement', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'create').mockResolvedValue({
          ...mockOrder,
          id: 'ord_cust_dup',
          orderNo: 'FR-888887',
        } as never);

        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          id: 'ord_cust_dup',
          orderNo: 'FR-888887',
        } as never);

        const res = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${customer1Token}`)
          .send({
            items: [
              { productId: mockProduct.id, quantity: 1 },
              { productId: mockProduct.id, quantity: 2 },
            ],
            shippingAddress: { city: 'Indore', address: 'MG Road' },
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(updateStockSpy).toHaveBeenCalledTimes(1);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { available: 47, reserved: 8 }, // 1 + 2 = 3 reserved
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RESERVATION,
            quantity: 3,
            productId: mockProduct.id,
          }),
          expect.anything(),
        );
      });
    });

    describe('3. Customer Isolation & Management', () => {
      it('lists only orders belonging to authenticated customer', async () => {
        vi.spyOn(prisma.order, 'count').mockResolvedValue(1);
        vi.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as never);

        const res = await request(app)
          .get('/api/v1/orders')
          .set('Authorization', `Bearer ${customer1Token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].customerId).toBe(customerUser1.id);
      });

      it('prevents a customer from accessing another customer’s order', async () => {
        vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(null); // Customer 2 does not own ord_test_1

        const res = await request(app)
          .get('/api/v1/orders/ord_test_1')
          .set('Authorization', `Bearer ${customer2Token}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });

      it('allows customer to cancel their own order in PLACED status and releases stock', async () => {
        const updateStockSpy = vi.spyOn(adminInventoryRepository, 'updateStockItem');
        const movementSpy = vi.spyOn(adminInventoryRepository, 'createMovement');

        vi.spyOn(prisma.order, 'findFirst').mockResolvedValue(mockOrder as never);
        vi.spyOn(prisma.order, 'update').mockResolvedValue({} as never);
        vi.spyOn(prisma.orderActivity, 'create').mockResolvedValue({} as never);
        vi.spyOn(prisma.order, 'findUnique').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CANCELLED,
        } as never);

        const res = await request(app)
          .post('/api/v1/orders/ord_test_1/cancel')
          .set('Authorization', `Bearer ${customer1Token}`)
          .send({ reason: 'Changed mind' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(OrderStatus.CANCELLED);
        expect(updateStockSpy).toHaveBeenCalledWith(
          'stk_test_1',
          { reserved: 3, available: 52 },
          expect.anything(),
        );
        expect(movementSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: MovementType.RELEASE,
            quantity: 2,
          }),
          expect.anything(),
        );
      });

      it('rejects cancellation by customer if order is already CONFIRMED or SHIPPED', async () => {
        vi.spyOn(prisma.order, 'findFirst').mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.SHIPPED,
        } as never);

        const res = await request(app)
          .post('/api/v1/orders/ord_test_1/cancel')
          .set('Authorization', `Bearer ${customer1Token}`)
          .send({ reason: 'Too late' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Only orders in \'Placed\' status can be cancelled');
      });
    });
  });
});
