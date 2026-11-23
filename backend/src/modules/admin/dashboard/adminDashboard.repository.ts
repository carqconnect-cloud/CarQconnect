import { SosEventStatus } from '@prisma/client';
import { prisma } from '../../../config/database';

export interface DashboardDateRanges {
  currentStart: Date;
  currentEnd: Date;
  prevStart: Date;
  prevEnd: Date;
}

export const adminDashboardRepository = {
  async getExecutiveOverview(ranges: DashboardDateRanges) {
    const { currentStart, currentEnd, prevStart, prevEnd } = ranges;

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      superAdminUsers,
      newUsersInPeriod,
      newUsersPrevPeriod,
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations,
      newOrgsInPeriod,
      newOrgsPrevPeriod,
      totalMemberships,
      activeMemberships,
      membershipsByRole,
      totalAuditLogs,
      auditLogsInPeriod,
      recentAuditLogs,
      totalCustomers,
      totalLeads,
      leadsByStatus,
      wonLeads,
      totalSos,
      activeSos,
      pendingSos,
      ackSos,
      escSos,
      resSos,
      recentSos,
      totalVehicles,
      totalGpsDevices,
      activeGpsDevices,
      totalProducts,
      activeProducts,
      totalSubscriptions,
      activeSubscriptions,
      totalQrCodes,
      activeQrCodes,
      totalOrders,
      paidOrders,
      paidOrdersRevenue,
    ] = await Promise.all([
      // Users counts
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { isSuperAdmin: true } }),
      prisma.user.count({
        where: { createdAt: { gte: currentStart, lte: currentEnd } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),

      // Organization counts
      prisma.organization.count(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.organization.count({ where: { isActive: false } }),
      prisma.organization.count({
        where: { createdAt: { gte: currentStart, lte: currentEnd } },
      }),
      prisma.organization.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),

      // Memberships
      prisma.membership.count(),
      prisma.membership.count({ where: { status: 'ACTIVE' } }),
      prisma.membership.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),

      // Audit logs
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: currentStart, lte: currentEnd } },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),

      // CRM platform totals
      prisma.customer.count(),
      prisma.lead.count(),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        where: { status: 'WON' },
        select: { value: true },
      }),

      // Live SOS platform metrics
      prisma.sosEvent.count(),
      prisma.sosEvent.count({
        where: {
          status: {
            in: [SosEventStatus.PENDING, SosEventStatus.ACKNOWLEDGED, SosEventStatus.ESCALATED],
          },
        },
      }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.PENDING } }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.ACKNOWLEDGED } }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.ESCALATED } }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.RESOLVED } }),
      prisma.sosEvent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          vehicleReg: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Live Vehicle platform metrics
      prisma.vehicle.count(),

      // Live GPS device metrics
      prisma.gPSDevice.count(),
      prisma.gPSDevice.count({ where: { status: 'ACTIVE' } }),

      // Live Store Product catalog metrics
      prisma.storeProduct.count(),
      prisma.storeProduct.count({ where: { inStock: true } }),

      // Live Consumer Subscription metrics
      prisma.userSubscription.count(),
      prisma.userSubscription.count({
        where: {
          status: 'ACTIVE',
        },
      }),

      // Live QR Code platform metrics
      prisma.qrCode.count(),
      prisma.qrCode.count({ where: { status: 'ACTIVE' } }),

      // Live Hardware Orders & Revenue metrics
      prisma.storeOrder.count(),
      prisma.storeOrder.count({ where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } } }),
      prisma.storeOrder.aggregate({
        where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    const wonDealValue = wonLeads.reduce(
      (acc, lead) => acc + Number(lead.value || 0),
      0,
    );

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        superAdmins: superAdminUsers,
        newInPeriod: newUsersInPeriod,
        newPrevPeriod: newUsersPrevPeriod,
      },
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        inactive: inactiveOrganizations,
        newInPeriod: newOrgsInPeriod,
        newPrevPeriod: newOrgsPrevPeriod,
      },
      memberships: {
        total: totalMemberships,
        active: activeMemberships,
        byRole: membershipsByRole.map((item) => ({
          role: item.role,
          count: item._count._all,
        })),
      },
      audit: {
        totalLogs: totalAuditLogs,
        logsInPeriod: auditLogsInPeriod,
        recent: recentAuditLogs,
      },
      crm: {
        totalCustomers,
        totalLeads,
        wonDealValue,
        leadsByStatus: leadsByStatus.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
      },
      sos: {
        total: totalSos,
        active: activeSos,
        pending: pendingSos,
        acknowledged: ackSos,
        escalated: escSos,
        resolved: resSos,
        recent: recentSos,
      },
      vehicles: {
        total: totalVehicles,
      },
      gpsDevices: {
        total: totalGpsDevices,
        active: activeGpsDevices,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      qrCodes: {
        total: totalQrCodes,
        active: activeQrCodes,
      },
      orders: {
        total: totalOrders,
        paid: paidOrders,
        revenue: paidOrdersRevenue._sum.totalAmount ?? 0,
      },
    };
  },

  async getOperationalAlerts(limit: number = 20) {
    const [deactivatedOrgs, deactivatedUsers, criticalAuditEvents, activeSosEvents] =
      await Promise.all([
        prisma.organization.findMany({
          where: { isActive: false },
          take: limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            updatedAt: true,
          },
        }),
        prisma.user.findMany({
          where: { isActive: false },
          take: limit,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            updatedAt: true,
          },
        }),
        prisma.auditLog.findMany({
          where: {
            action: {
              in: [
                'admin.user_deactivated',
                'admin.organization_deactivated',
                'auth.password_changed',
              ],
            },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            createdAt: true,
            actor: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        }),
        prisma.sosEvent.findMany({
          where: {
            status: { in: [SosEventStatus.PENDING, SosEventStatus.ESCALATED] },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            vehicleReg: true,
            createdAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
      ]);

    return {
      deactivatedOrgs,
      deactivatedUsers,
      criticalAuditEvents,
      activeSosEvents,
    };
  },

  async checkDatabaseHealth(): Promise<{ isHealthy: boolean; latencyMs: number }> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { isHealthy: true, latencyMs: Date.now() - startTime };
    } catch {
      return { isHealthy: false, latencyMs: -1 };
    }
  },
};
