import { prisma } from '../../../config/database';
import type { Prisma } from '@prisma/client';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.schema';

async function enrichCustomersWithRealData(items: any[]) {
  if (!items || items.length === 0) return items;

  const emails = items.map(c => c.email).filter(Boolean);
  const phones = items.map(c => c.phone).filter(Boolean);
  const ids = items.map(c => c.id).filter(Boolean);

  // 1. Real Support Tickets
  const realTickets = await prisma.supportTicket.findMany({
    where: {
      OR: [
        { customerId: { in: ids } },
        ...(emails.length > 0 ? [{ customer: { email: { in: emails } } }] : []),
        ...(phones.length > 0 ? [{ customer: { phone: { in: phones } } }] : []),
      ],
    },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  // 2. Real Users with Vehicles, Documents, SOS, QR
  const users = await prisma.user.findMany({
    where: {
      OR: [
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
        ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
      ],
    },
    include: {
      vehicles: {
        select: {
          id: true,
          reg: true,
          model: true,
          createdAt: true,
        },
      },
      documents: true,
      emergencyContacts: true,
      addresses: true,
      reminders: true,
      qrCodes: true,
    },
  }).catch(() => []);

  const userIds = users.map(u => u.id);

  // 3. Real Store Orders
  const orders = userIds.length > 0 ? await prisma.storeOrder.findMany({
    where: { userId: { in: userIds } },
    include: {
      items: { include: { product: true } },
      address: true,
    },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []) : [];

  // 4. Real User Subscriptions
  const subscriptions = userIds.length > 0 ? await prisma.userSubscription.findMany({
    where: { userId: { in: userIds } },
    include: { plan: true },
  }).catch(() => []) : [];

  // 5. Real Trips
  let trips: any[] = [];
  if (userIds.length > 0) {
    trips = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "trips" WHERE "userId" IN (${userIds.map((_, i) => `$${i + 1}`).join(',')}) ORDER BY "createdAt" DESC;`,
      ...userIds
    ).catch(() => []);
  }

  // 6. Real AI Chat Conversations
  let chats: any[] = [];
  if (emails.length > 0 || userIds.length > 0) {
    chats = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ai_chat_conversations" 
       WHERE "userEmail" IN (${emails.map((_, i) => `$${i + 1}`).join(',')})
          OR "userId" IN (${userIds.map((_, i) => `$${emails.length + i + 1}`).join(',')})
       ORDER BY "createdAt" DESC LIMIT 100;`,
      ...emails,
      ...userIds
    ).catch(() => []);
  }

  return items.map(c => {
    const matchedTickets = realTickets.filter(t =>
      t.customerId === c.id ||
      (c.email && (t.customer?.email === c.email || (t as any).customerEmail === c.email)) ||
      (c.phone && (t.customer?.phone === c.phone || (t as any).customerPhone === c.phone))
    );

    const formattedRealTickets = matchedTickets.map(t => {
      const subject = t.subject || 'Support Request';
      const categoryMatch = subject.match(/^\[(.*?)\]/);
      const category = categoryMatch ? categoryMatch[1] : 'General';
      const cleanSubject = categoryMatch ? subject.replace(/^\[.*?\]\s*/, '') : subject;

      return {
        id: t.id,
        rawId: t.id,
        type: category,
        subject: cleanSubject,
        description: t.description || '',
        status: t.status === 'OPEN' ? 'Open' : (t.status === 'RESOLVED' ? 'Resolved' : t.status),
        priority: t.priority || 'Medium',
        agent: (t as any).assignedToName || 'Customer Support',
        date: new Date(t.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      };
    });

    const meta = (c.metadata && typeof c.metadata === 'object') ? { ...c.metadata } : {};
    meta.tickets = formattedRealTickets;

    const matchedUser = users.find(u =>
      (c.email && u.email?.toLowerCase() === c.email?.toLowerCase()) ||
      (c.phone && u.phone && u.phone === c.phone)
    );

    if (matchedUser) {
      // Vehicles
      meta.vehicles = matchedUser.vehicles.map(v => {
        const hasQr = matchedUser.qrCodes?.some(q => q.vehicleId === v.id);
        return {
          id: v.id,
          model: v.model,
          name: v.model,
          regNumber: v.reg,
          hw: hasQr ? 'Smart QR Tag' : 'GPS Tracker (OBD)',
          health: 100,
          obdStatus: 'Healthy (No active codes)',
          obdReasons: [],
          status: 'Valid',
          ping: 'Active',
          imagePath: null,
        };
      });

      // Documents
      meta.documents = matchedUser.documents.map(d => ({
        id: d.id,
        name: d.title,
        title: d.title,
        type: d.title,
        docType: d.docType,
        status: d.status || 'Valid',
        regNumber: d.regNumber,
        ownerName: d.ownerName,
        url: d.frontImageUrl,
        frontImageUrl: d.frontImageUrl,
        backImageUrl: d.backImageUrl,
        issueDate: d.issueDate,
        expiryDate: d.expiryDate,
        bankName: d.bankName,
        subtitle: d.subtitle,
      }));

      // Emergency contacts / SOS
      meta.emergencyContacts = matchedUser.emergencyContacts;
      meta.sos = matchedUser.emergencyContacts.map(ec => ({
        id: ec.id,
        name: ec.name,
        contact: ec.name,
        phone: ec.phone,
        relation: ec.relationship,
        relationship: ec.relationship,
        isPrimary: ec.isPrimary,
        initials: ec.initials,
      }));

      // Trips
      const userTrips = trips.filter(t => t.userId === matchedUser.id);
      meta.trips = userTrips;
      meta.tripsCompleted = userTrips.filter(t => t.status === 'COMPLETED').length;
      const totalDist = userTrips.reduce((acc, t) => {
        const match = (t.distance || '').match(/([0-9.]+)/);
        return acc + (match ? parseFloat(match[1]) : 0);
      }, 0);
      meta.totalDistance = `${Math.round(totalDist)} km`;

      // Orders
      const userOrders = orders.filter(o => o.userId === matchedUser.id);
      meta.orders = userOrders.map(o => {
        const itemNames = o.items.map(it => `${it.product?.title || 'Product'} (x${it.quantity})`).join(', ');
        return {
          id: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
          rawId: o.id,
          item: itemNames || 'Store Order',
          amount: `₹${o.totalAmount.toLocaleString('en-IN')}`,
          date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: o.status === 'PAID' ? 'Completed' : o.status === 'DELIVERED' ? 'Delivered' : o.status === 'PENDING' ? 'Pending' : o.status,
          items: o.items,
          address: o.address,
        };
      });

      // Subscriptions
      const sub = subscriptions.find(s => s.userId === matchedUser.id);
      if (sub) {
        meta.plan = sub.plan?.name || 'Starter (Free)';
        meta.subscription = {
          id: sub.id,
          planId: sub.planId,
          planName: sub.plan.name,
          price: sub.plan.price,
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
        };
      }

      // Chats
      const userChats = chats.filter(ch => ch.userId === matchedUser.id || (matchedUser.email && ch.userEmail === matchedUser.email));
      meta.chats = userChats.map(c => ({
        id: c.id,
        sessionId: c.sessionId,
        summary: c.summary || c.userMessage,
        instruction: `User: ${c.userMessage}\nAI: ${c.aiResponse}`,
        userMessage: c.userMessage,
        aiResponse: c.aiResponse,
        date: new Date(c.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: c.createdAt,
      }));

      meta.devices = (meta.vehicles?.length || 0) + (matchedUser.qrCodes?.length || 0);
    }

    return {
      ...c,
      metadata: meta,
      supportTickets: matchedTickets,
      vehicles: meta.vehicles || [],
      documents: meta.documents || [],
      emergencyContacts: meta.emergencyContacts || [],
      sos: meta.sos || [],
      trips: meta.trips || [],
      orders: meta.orders || [],
      chats: meta.chats || [],
      plan: meta.plan || c.plan || 'Starter',
      devices: meta.devices || 0,
    };
  });
}

export const customerRepository = {
  async findMany(orgId: string, skip: number, take: number, search?: string) {
    const where: Prisma.CustomerWhereInput = {
      ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: 'cmv0tt0bc0000i6ngjtvt0jff' }] } : {}),
      ...(search
        ? {
          AND: [
            {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { supportTickets: true } }),
      prisma.customer.count({ where }),
    ]);
    const enriched = await enrichCustomersWithRealData(items);
    return { items: enriched, total };
  },

  async findById(orgId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: 'cmv0tt0bc0000i6ngjtvt0jff' }] } : {}),
      },
      include: {
        leads: true,
        supportTickets: true,
      },
    });
    if (!customer) return null;
    const [enriched] = await enrichCustomersWithRealData([customer]);
    return enriched;
  },

  async create(orgId: string, data: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        organizationId: orgId,
        ...data,
      },
    });
  },

  async update(orgId: string, id: string, data: UpdateCustomerInput) {
    await prisma.customer.updateMany({
      where: { id, organizationId: orgId },
      data,
    });
    return this.findById(orgId, id);
  },

  async delete(orgId: string, id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.customer.deleteMany({
      where: { id, organizationId: orgId },
    });
  },
};
