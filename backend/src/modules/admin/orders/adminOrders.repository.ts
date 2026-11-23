import { StoreOrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { ListOrdersQueryInput } from './adminOrders.schema';

export interface FormattedStoreOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle: string;
  productSubtitle: string;
  productImage: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface FormattedStoreOrder {
  id: string;
  orderNo: string;
  userId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: {
    id: string;
    type: string;
    address: string;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
  items: FormattedStoreOrderItem[];
  product: string;
  qty: number;
  amount: number;
  status: StoreOrderStatus;
  payStatus: 'PAID' | 'COD' | 'PENDING' | 'CANCELLED';
  paymentMethod: string;
  paymentId: string | null;
  paymentOrderId: string | null;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function formatStoreOrder(o: any): FormattedStoreOrder {
  const items: FormattedStoreOrderItem[] = (o.items || []).map((i: any) => ({
    id: i.id,
    orderId: i.orderId,
    productId: i.productId,
    productTitle: i.product?.title || 'Store Product',
    productSubtitle: i.product?.subtitle || '',
    productImage: i.product?.image || 'assets/homescreensicons/obd_dongle.png',
    category: i.product?.category || 'Hardware',
    quantity: i.quantity,
    unitPrice: i.price,
    totalPrice: i.price * i.quantity,
  }));

  const totalQty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const firstItemTitle = items[0]?.productTitle || 'Hardware Product';
  const productSummary = items.length > 1 ? `${firstItemTitle} (+${items.length - 1} more)` : firstItemTitle;

  const isCOD = !o.paymentId || o.paymentId === 'COD' || o.paymentOrderId === 'CASH_ON_DELIVERY';
  const isOnlinePaid =
    !!o.paymentId &&
    o.paymentId !== 'COD' &&
    (o.paymentId.startsWith('pay_') ||
      o.status === StoreOrderStatus.PAID ||
      o.status === StoreOrderStatus.SHIPPED ||
      o.status === StoreOrderStatus.DELIVERED);

  let payStatus: 'PAID' | 'COD' | 'PENDING' | 'CANCELLED';
  if (o.status === StoreOrderStatus.CANCELLED) {
    payStatus = 'CANCELLED';
  } else if (o.status === StoreOrderStatus.PAID || o.status === StoreOrderStatus.DELIVERED) {
    payStatus = 'PAID';
  } else if (isCOD) {
    payStatus = 'COD';
  } else if (isOnlinePaid) {
    payStatus = 'PAID';
  } else {
    payStatus = 'PENDING';
  }

  const paymentMethod = isCOD ? 'Cash on Delivery (COD)' : 'Online (Razorpay)';

  const customerName = o.user
    ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() || o.user.email
    : 'Customer';

  return {
    id: o.id,
    orderNo: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
    userId: o.userId,
    customerId: o.userId,
    customerName,
    customerEmail: o.user?.email || '',
    customerPhone: o.user?.phone || null,
    shippingAddress: o.address
      ? {
          id: o.address.id,
          type: o.address.type,
          address: o.address.address,
          landmark: o.address.landmark,
          city: o.address.city,
          state: o.address.state,
          pincode: o.address.pincode,
        }
      : null,
    items,
    product: productSummary,
    qty: totalQty || 1,
    amount: o.totalAmount ?? 0,
    status: o.status,
    payStatus,
    paymentMethod,
    paymentId: o.paymentId || (isCOD ? 'COD' : null),
    paymentOrderId: o.paymentOrderId || (isCOD ? 'CASH_ON_DELIVERY' : null),
    placedAt: o.createdAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export const adminOrdersRepository = {
  async listOrders(query: ListOrdersQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreOrderWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as StoreOrderStatus;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { id: { contains: s, mode: 'insensitive' } },
        { paymentId: { contains: s, mode: 'insensitive' } },
        { user: { firstName: { contains: s, mode: 'insensitive' } } },
        { user: { lastName: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { user: { phone: { contains: s, mode: 'insensitive' } } },
        { items: { some: { product: { title: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    const [rawOrders, total] = await Promise.all([
      prisma.storeOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          address: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.storeOrder.count({ where }),
    ]);

    const orders = rawOrders.map(formatStoreOrder);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async findOrderById(id: string) {
    const order = await prisma.storeOrder.findUnique({
      where: { id },
      include: {
        user: true,
        address: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) return null;
    return formatStoreOrder(order);
  },

  async updateOrderStatus(id: string, status: StoreOrderStatus) {
    const updated = await prisma.storeOrder.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        address: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return formatStoreOrder(updated);
  },

  async getOrderStats() {
    const [
      totalOrders,
      pendingOrders,
      paidOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      revenueAggregate,
    ] = await Promise.all([
      prisma.storeOrder.count(),
      prisma.storeOrder.count({ where: { status: StoreOrderStatus.PENDING } }),
      prisma.storeOrder.count({ where: { status: StoreOrderStatus.PAID } }),
      prisma.storeOrder.count({ where: { status: StoreOrderStatus.SHIPPED } }),
      prisma.storeOrder.count({ where: { status: StoreOrderStatus.DELIVERED } }),
      prisma.storeOrder.count({ where: { status: StoreOrderStatus.CANCELLED } }),
      prisma.storeOrder.aggregate({
        where: {
          status: {
            in: [StoreOrderStatus.PAID, StoreOrderStatus.SHIPPED, StoreOrderStatus.DELIVERED],
          },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      paidOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: revenueAggregate._sum.totalAmount ?? 0,
    };
  },
};
