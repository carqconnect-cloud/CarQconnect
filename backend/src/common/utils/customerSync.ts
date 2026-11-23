import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

const activeSyncUserIds = new Set<string>();

/**
 * Synchronize mobile app user and relations (vehicles, qrCodes, documents) to super-admin Customer.
 * Fully typed against Prisma User with qrCodes relation.
 */
export async function syncUserToCustomer(userId: string) {
  if (activeSyncUserIds.has(userId)) {
    return;
  }
  activeSyncUserIds.add(userId);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { organization: true },
        },
        vehicles: {
          select: {
            id: true,
            reg: true,
            model: true,
            createdAt: true,
          },
        },
        addresses: true,
        documents: true,
        reminders: true,
        emergencyContacts: true,
        qrCodes: true,
      },
    });

    if (!user) return;

    // Fetch subscription details
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    // Fetch user orders with product details
    const orders = await prisma.storeOrder.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user trips (avoid fetching heavy GPS polyline geometry to save memory)
    const userTrips = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "title", "distance", "duration", "status", "createdAt" 
       FROM "trips" 
       WHERE "userId" = $1 
       ORDER BY "createdAt" DESC 
       LIMIT 50;`,
      userId
    ).catch(() => []);
    const completedTrips = userTrips.filter(t => t.status === 'COMPLETED');
    const totalDistKm = userTrips.reduce((acc, t) => {
      const match = (t.distance || '').match(/([0-9.]+)/);
      return acc + (match ? parseFloat(match[1]) : 0);
    }, 0);

    // Calculate spend and plan
    const planName = subscription?.plan?.name || 'Starter (Free)';
    const ordersSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const subscriptionPrice = subscription?.plan?.price || 0;
    const totalSpend = ordersSpend + subscriptionPrice;
    const spendFormatted = `₹${totalSpend.toLocaleString('en-IN')}`;

    // Format address
    const defaultAddr = user.addresses.find((a) => a.isDefault) || user.addresses[0];
    const addressString = defaultAddr
      ? `${defaultAddr.address}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pincode}`
      : null;

    // Format orders for CRM
    const formattedOrders = orders.map((o) => {
      const itemNames = o.items
        .map((it) => `${it.product?.title || 'Product'} (x${it.quantity})`)
        .join(', ');
      return {
        id: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
        rawId: o.id,
        item: itemNames || 'Store Order',
        amount: `₹${o.totalAmount.toLocaleString('en-IN')}`,
        date: new Date(o.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        status:
          o.status === 'PAID'
            ? 'Completed'
            : o.status === 'DELIVERED'
            ? 'Delivered'
            : o.status === 'PENDING'
            ? 'Pending'
            : o.status,
        items: o.items,
        address: o.address,
      };
    });

    // Format vehicles for CRM
    const formattedVehicles = user.vehicles.map((v) => {
      const hasQr = user.qrCodes.some((q) => q.vehicleId === v.id);
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

    // Format documents for CRM
    const formattedDocs = user.documents.map((d) => ({
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

    // Format SOS contacts
    const formattedSos = user.emergencyContacts.map((c) => ({
      id: c.id,
      name: c.name,
      contact: c.name,
      phone: c.phone,
      relation: c.relationship,
      relationship: c.relationship,
      isPrimary: c.isPrimary,
      initials: c.initials,
    }));

    // Format recent activity
    const activity: any[] = [];
    if (subscription) {
      activity.push({
        id: `ACT-SUB-${subscription.id.slice(0, 4)}`,
        message: `Upgraded to ${subscription.plan.name} Plan`,
        time: new Date(subscription.startDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        color: 'bg-emerald-500',
      });
    }
    for (const o of orders) {
      activity.push({
        id: `ACT-ORD-${o.id.slice(0, 4)}`,
        message: `Placed store order for ₹${o.totalAmount.toLocaleString('en-IN')}`,
        time: new Date(o.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        color: 'bg-blue-500',
      });
    }
    for (const v of user.vehicles) {
      activity.push({
        id: `ACT-VEH-${v.id.slice(0, 4)}`,
        message: `Added vehicle: ${v.model} (${v.reg})`,
        time: new Date(v.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        color: 'bg-purple-500',
      });
    }
    for (const d of user.documents) {
      activity.push({
        id: `ACT-DOC-${d.id.slice(0, 4)}`,
        message: `Uploaded document: ${d.title}`,
        time: new Date(d.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        color: 'bg-amber-500',
      });
    }

    // Fetch user support tickets
    const fullNameForSearch = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const userTickets = await prisma.supportTicket.findMany({
      where: {
        OR: [
          { customer: { email: user.email } },
          ...(user.phone ? [{ customer: { phone: user.phone } }] : []),
          ...(fullNameForSearch ? [{ customer: { name: { equals: fullNameForSearch, mode: 'insensitive' as const } } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const formattedTickets = userTickets.map((t) => {
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
        status: t.status === 'OPEN' ? 'Open' : t.status === 'RESOLVED' ? 'Resolved' : t.status,
        priority: t.priority || 'Medium',
        agent: (t as any).assignedToName || 'Customer Support',
        date: new Date(t.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      };
    });

    for (const t of userTickets) {
      activity.push({
        id: `ACT-TKT-${t.id.replace('#', '')}`,
        message: `Raised support ticket: ${t.subject}`,
        time: new Date(t.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        color: 'bg-red-500',
      });
    }

    // Fetch AI chat conversations
    const userChats = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ai_chat_conversations" 
       WHERE ($1::text IS NOT NULL AND "userEmail" = $1) 
          OR ($2::text IS NOT NULL AND "userId" = $2) 
       ORDER BY "createdAt" DESC LIMIT 50;`,
      user.email,
      user.id
    ).catch(() => []);

    const formattedChats = userChats.map((c) => ({
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

    const metadata = {
      userId: user.id,
      isAppUser: true,
      plan: planName,
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.planId,
            planName: subscription.plan.name,
            price: subscription.plan.price,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          }
        : null,
      spend: spendFormatted,
      totalSpend,
      devices: user.vehicles.length + user.qrCodes.length,
      health: 100,
      expiryDays: 365,
      orders: formattedOrders,
      vehicles: formattedVehicles,
      documents: formattedDocs,
      emergencyContacts: user.emergencyContacts,
      sos: formattedSos,
      reminders: user.reminders,
      addresses: user.addresses,
      qrTags: user.qrCodes.map((q) => ({ ...q, tagId: q.code })),
      qrCodes: user.qrCodes,
      tickets: formattedTickets,
      chats: formattedChats,
      activity,
      trips: userTrips,
      tripsCompleted: completedTrips.length,
      totalDistance: `${Math.round(totalDistKm)} km`,
    };

    // Maintain strictly ONE customer record per user attached to the primary company organization
    const primaryOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    const targetOrgId = primaryOrg?.id || 'cmv0tt0bc0000i6ngjtvt0jff';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: user.email },
          ...(user.phone ? [{ phone: user.phone }] : []),
        ],
      },
    });

    if (existingCustomer) {
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          organizationId: targetOrgId,
          name: fullName,
          email: user.email,
          phone: user.phone || undefined,
          address: addressString || existingCustomer.address,
          metadata: metadata as any,
        },
      });
    } else {
      await prisma.customer.create({
        data: {
          organizationId: targetOrgId,
          name: fullName,
          email: user.email,
          phone: user.phone || '',
          address: addressString || null,
          metadata: metadata as any,
        },
      });
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to sync user to customer');
  } finally {
    activeSyncUserIds.delete(userId);
  }
}

/**
 * Delete corresponding customer record when an app user is deleted
 */
export async function deleteCustomerByUser(email: string, phone?: string | null) {
  try {
    const conditions: any[] = [];
    if (email) conditions.push({ email });
    if (phone) conditions.push({ phone });

    if (conditions.length === 0) return;

    await prisma.customer.deleteMany({
      where: { OR: conditions },
    });
  } catch (error) {
    logger.error({ error, email, phone }, 'Failed to delete customer for user');
  }
}

export async function syncAllUsersToCustomers() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, phone: true } });
    for (const u of users) {
      await syncUserToCustomer(u.id);
    }

    // Clean up orphaned customers that don't correspond to any active user
    const validEmails = users.map(u => (u.email || '').toLowerCase()).filter(Boolean);
    const validPhones = users.map(u => u.phone).filter(Boolean);

    const customers = await prisma.customer.findMany({
      select: { id: true, email: true, phone: true, metadata: true },
    });

    for (const cust of customers) {
      const isAppUser = (cust.metadata as any)?.isAppUser;
      const emailMatch = cust.email && validEmails.includes(cust.email.toLowerCase());
      const phoneMatch = cust.phone && validPhones.includes(cust.phone);

      // If it was marked as app user and no user matches, or if it has matching email/phone neither
      if (isAppUser && !emailMatch && !phoneMatch) {
        await prisma.customer.delete({ where: { id: cust.id } }).catch(() => {});
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to sync all users to customers');
  }
}
