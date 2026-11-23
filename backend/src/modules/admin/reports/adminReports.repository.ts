import type {
  GpsDeviceStatus,
  Prisma,
  QrStatus,
} from '@prisma/client';
import { prisma } from '../../../config/database';
import type { GetReportQueryInput } from './adminReports.schema';

function parseDateRange(query: Partial<GetReportQueryInput>) {
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.startDate) {
    createdAt.gte = new Date(
      query.startDate.includes('T') ? query.startDate : `${query.startDate}T00:00:00.000Z`,
    );
  }
  if (query.endDate) {
    createdAt.lte = new Date(
      query.endDate.includes('T') ? query.endDate : `${query.endDate}T23:59:59.999Z`,
    );
  }
  return Object.keys(createdAt).length > 0 ? createdAt : undefined;
}

export const adminReportsRepository = {
  // 1. User Growth Report
  async getUsersReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: Prisma.UserWhereInput = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.createdAt = dateRange;

    if (filters.status) {
      if (filters.status.toLowerCase() === 'active') where.isActive = true;
      if (filters.status.toLowerCase() === 'suspended') where.isActive = false;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          isSuperAdmin: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return { rows, total };
  },

  // 2. Revenue & Orders Report
  async getRevenueReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: any = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.createdAt = dateRange;

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rawRows, total] = await Promise.all([
      prisma.storeOrder.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.storeOrder.count({ where }),
    ]);

    const rows = rawRows.map((o) => ({
      id: o.id,
      orderNo: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
      customerName: o.user ? `${o.user.firstName} ${o.user.lastName}`.trim() : 'Customer',
      customerEmail: o.user?.email || '',
      amount: o.totalAmount,
      currency: 'INR',
      status: o.status,
      payStatus: (o.status !== 'PENDING' && o.status !== 'CANCELLED') || o.paymentId ? 'PAID' : 'PENDING',
      createdAt: o.createdAt,
      user: o.user,
    }));

    return { rows, total };
  },

  // 3. QR Code Scans & Distribution Report
  async getQrScansReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: Prisma.QrCodeWhereInput = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.createdAt = dateRange;

    if (filters.status) {
      where.status = filters.status.toUpperCase() as QrStatus;
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.qrCode.findMany({
        where,
        select: {
          id: true,
          code: true,
          batch: true,
          status: true,
          scansCount: true,
          createdAt: true,
          vehicle: {
            select: {
              reg: true,
              model: true,
            },
          },
        },
        orderBy: { scansCount: 'desc' },
        skip,
        take,
      }),
      prisma.qrCode.count({ where }),
    ]);

    return { rows, total };
  },

  // 4. Device Activations & GPS Fleet Report
  async getDeviceActivationReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: Prisma.GPSDeviceWhereInput = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.createdAt = dateRange;

    if (filters.status) {
      where.status = filters.status.toUpperCase() as GpsDeviceStatus;
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.gPSDevice.findMany({
        where,
        select: {
          id: true,
          imei: true,
          status: true,
          batteryLevel: true,
          signalStrength: true,
          lastSeenAt: true,
          createdAt: true,
          vehicle: {
            select: {
              reg: true,
              model: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.gPSDevice.count({ where }),
    ]);

    return { rows, total };
  },

  // 5. Membership Conversion & Subscriptions Report
  async getMembershipConversionReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: Prisma.UserSubscriptionWhereInput = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.startDate = dateRange;

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.userSubscription.findMany({
        where,
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          plan: {
            select: {
              name: true,
              price: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take,
      }),
      prisma.userSubscription.count({ where }),
    ]);

    const formattedRows = rows.map((r) => ({
      id: r.id,
      status: r.status,
      autoRenew: false,
      startedAt: r.startDate,
      expiresAt: r.endDate,
      createdAt: r.startDate,
      amountPaidInPaise: (r.plan?.price || 0) * 100,
      user: r.user,
      plan: {
        name: r.plan?.name || 'Standard Plan',
        priceInPaise: (r.plan?.price || 0) * 100,
        color: 'info',
      },
    }));

    return { rows: formattedRows, total };
  },

  // 6. Support Desk Volume & Triage Report
  async getSupportVolumeReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: Prisma.SupportTicketWhereInput = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.createdAt = dateRange;

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }
    if (filters.priority) {
      where.priority = filters.priority.toUpperCase();
    }
    if (filters.category) {
      where.category = { equals: filters.category, mode: 'insensitive' };
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        select: {
          id: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          aiEscalated: true,
          createdAt: true,
          resolvedAt: true,
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { rows, total };
  },

  // 7. AI Governance & Telemetry Report
  async getAiGovernanceReport() {
    const [articles, intents, tools, rules] = await Promise.all([
      prisma.aiKnowledgeArticle.findMany({
        select: {
          id: true,
          question: true,
          category: true,
          status: true,
          answer: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.aiIntent.findMany({
        select: {
          id: true,
          name: true,
          tool: true,
          threshold: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.aiToolPermission.findMany({
        select: {
          id: true,
          toolKey: true,
          name: true,
          read: true,
          write: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.aiEscalationRule.findMany({
        select: {
          id: true,
          condition: true,
          action: true,
          active: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { articles, intents, tools, rules };
  },

  // 8. CRM Call Outcomes Report
  async getCallOutcomesReport(filters: Partial<GetReportQueryInput> = {}) {
    const where: Prisma.CallRecordWhereInput = {};
    const dateRange = parseDateRange(filters);
    if (dateRange) where.createdAt = dateRange;

    if (filters.type) {
      where.type = filters.type.toUpperCase();
    }
    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    const take = filters.limit ?? 100;
    const skip = filters.page ? (filters.page - 1) * take : 0;

    const [rows, total] = await Promise.all([
      prisma.callRecord.findMany({
        where,
        select: {
          id: true,
          type: true,
          duration: true,
          status: true,
          notes: true,
          createdAt: true,
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
          lead: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.callRecord.count({ where }),
    ]);

    return { rows, total };
  },

  // Summary counts for all 8 reports
  async getAllReportsSummary() {
    const [
      usersCount,
      ordersCount,
      qrCount,
      gpsCount,
      subCount,
      ticketCount,
      aiKnowledgeCount,
      aiIntentCount,
      aiToolsCount,
      aiRulesCount,
      callsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.storeOrder.count(),
      prisma.qrCode.count(),
      prisma.gPSDevice.count(),
      prisma.userSubscription.count(),
      prisma.supportTicket.count(),
      prisma.aiKnowledgeArticle.count(),
      prisma.aiIntent.count(),
      prisma.aiToolPermission.count(),
      prisma.aiEscalationRule.count(),
      prisma.callRecord.count(),
    ]);

    return {
      users: usersCount,
      revenue: ordersCount,
      'qr-scans': qrCount,
      'device-activation': gpsCount,
      'membership-conv': subCount,
      'support-volume': ticketCount,
      'ai-containment': aiKnowledgeCount + aiIntentCount + aiToolsCount + aiRulesCount,
      'call-outcomes': callsCount,
    };
  },
};
