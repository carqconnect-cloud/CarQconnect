import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export interface FormattedAdminCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  organizationId: string;
  plan: string;
  spend: string;
  totalSpend: number;
  health: number;
  devices: number;
  expiryDays: number;
  vehicles: any[];
  orders: any[];
  trips: any[];
  tripsCompleted: number;
  totalDistance: string;
  emergencyContacts: any[];
  sos: any[];
  documents: any[];
  reminders: any[];
  tickets: any[];
  chats: any[];
  activity: any[];
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export function formatCustomerRecord(c: any): FormattedAdminCustomer {
  const meta = (c.metadata && typeof c.metadata === 'object') ? c.metadata : {};
  const rawTrips = meta.trips || c.trips || [];
  const normalizedTrips = rawTrips.map((t: any) => ({
    ...t,
    from: t.fromName || t.from || 'Indore',
    to: t.toName || t.to || 'Dewas',
    fromName: t.fromName || t.from || 'Indore',
    toName: t.toName || t.to || 'Dewas',
    cost: t.cost || (t.distance ? `₹${Math.round((parseFloat(t.distance) || 35) * 3.2)}` : '₹120'),
    health: t.health ?? 100,
    distance: t.distance || '36 km',
    duration: t.duration || '46m',
    viaRoute: t.viaRoute || 'Direct Route',
    status: t.status || 'COMPLETED',
    createdAt: t.createdAt || t.date || new Date().toISOString(),
  }));

  const vehicles = meta.vehicles || [];
  const orders = meta.orders || [];
  const qrTags = meta.qrTags || meta.qrCodes || [];

  return {
    id: c.id,
    name: c.name || c.email || 'Customer',
    email: c.email || null,
    phone: c.phone || '—',
    company: c.company || null,
    address: c.address || null,
    organizationId: c.organizationId,
    plan: meta.plan || 'Starter (Free)',
    spend: meta.spend || '₹0',
    totalSpend: meta.totalSpend || 0,
    health: meta.health ?? 100,
    devices: meta.devices ?? (vehicles.length + qrTags.length),
    expiryDays: meta.expiryDays ?? 365,
    vehicles,
    orders,
    trips: normalizedTrips,
    tripsCompleted: meta.tripsCompleted ?? normalizedTrips.length,
    totalDistance: meta.totalDistance || (normalizedTrips.length > 0 ? `${normalizedTrips.reduce((acc: number, curr: any) => acc + (parseFloat(curr.distance) || 0), 0)} km` : '0 km'),
    emergencyContacts: meta.emergencyContacts || meta.sos || [],
    sos: meta.sos || meta.emergencyContacts || [],
    documents: meta.documents || [],
    reminders: meta.reminders || [],
    tickets: (c.supportTickets && c.supportTickets.length > 0)
      ? c.supportTickets.map((t: any) => ({
          id: t.id,
          type: t.category || t.subject || 'Support Request',
          subject: t.subject,
          description: t.description || '',
          agent: t.assignedToName || 'Customer Support',
          status: t.status === 'OPEN' ? 'Open' : (t.status === 'RESOLVED' ? 'Resolved' : t.status),
          priority: t.priority || 'Medium',
          date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently',
        }))
      : (meta.tickets || []),
    chats: meta.chats || [],
    activity: meta.activity || [],
    metadata: meta,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export interface ListAdminUsersRepoArgs {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
  search?: string;
  plan?: string;
  health?: string;
}

export const adminUserRepository = {
  async listCustomers(args: ListAdminUsersRepoArgs) {
    const where: Prisma.CustomerWhereInput = {};

    if (args.search) {
      where.OR = [
        { name: { contains: args.search, mode: 'insensitive' } },
        { email: { contains: args.search, mode: 'insensitive' } },
        { phone: { contains: args.search, mode: 'insensitive' } },
        { address: { contains: args.search, mode: 'insensitive' } },
        { company: { contains: args.search, mode: 'insensitive' } },
      ];
    }

    const [rawCustomers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: args.orderBy,
        include: {
          supportTickets: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const items = rawCustomers.map(formatCustomerRecord);
    return { items, total };
  },

  async findCustomerById(id: string) {
    const c = await prisma.customer.findUnique({
      where: { id },
      include: {
        supportTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!c) return null;
    return formatCustomerRecord(c);
  },

  async findCustomerByEmail(email: string) {
    return prisma.customer.findFirst({
      where: { email },
    });
  },

  async createCustomer(data: {
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    address?: string | null;
    metadata?: any;
  }) {
    const primaryOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const organizationId = primaryOrg?.id || 'cmv0tt0bc0000i6ngjtvt0jff';

    const defaultMeta = {
      plan: data.metadata?.plan || 'Starter (Free)',
      spend: data.metadata?.spend || '₹0',
      totalSpend: data.metadata?.totalSpend || 0,
      health: data.metadata?.health ?? 100,
      devices: data.metadata?.devices ?? 0,
      expiryDays: data.metadata?.expiryDays ?? 365,
      vehicles: data.metadata?.vehicles || [],
      orders: data.metadata?.orders || [],
      trips: data.metadata?.trips || [],
      tripsCompleted: 0,
      totalDistance: '0 km',
      emergencyContacts: data.metadata?.emergencyContacts || [],
      sos: data.metadata?.sos || [],
      documents: data.metadata?.documents || [],
      reminders: data.metadata?.reminders || [],
      tickets: [],
      chats: [],
      activity: [
        {
          id: `act_${Date.now()}`,
          type: 'account_created',
          description: 'Customer profile registered in Control Center',
          timestamp: new Date().toISOString(),
        },
      ],
      ...(data.metadata || {}),
    };

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        address: data.address || null,
        metadata: defaultMeta as any,
      },
      include: {
        supportTickets: true,
      },
    });

    return formatCustomerRecord(customer);
  },

  async updateCustomer(id: string, data: Partial<{
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    metadata: any;
  }>) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return null;

    const mergedMeta = data.metadata
      ? { ...((existing.metadata as any) || {}), ...data.metadata }
      : undefined;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.company !== undefined ? { company: data.company } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(mergedMeta !== undefined ? { metadata: mergedMeta } : {}),
      },
      include: {
        supportTickets: true,
      },
    });

    return formatCustomerRecord(updated);
  },

  async deleteCustomer(id: string) {
    return prisma.customer.delete({ where: { id } });
  },

  async getCustomerStats() {
    const [totalCustomers, customers] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.findMany({
        select: { metadata: true },
      }),
    ]);

    let totalRevenue = 0;
    let totalDevices = 0;
    let totalHealth = 0;
    let activePlans = 0;

    for (const c of customers) {
      const meta = (c.metadata as any) || {};
      totalRevenue += meta.totalSpend || 0;
      totalDevices += meta.devices || 0;
      totalHealth += meta.health ?? 100;
      if (meta.plan && meta.plan !== 'Starter (Free)' && meta.plan !== 'Free') {
        activePlans++;
      }
    }

    const avgHealth = customers.length > 0 ? Math.round(totalHealth / customers.length) : 100;

    return {
      totalCustomers,
      activePlans,
      totalRevenue,
      totalDevices,
      avgHealth,
    };
  },
};
