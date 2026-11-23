import { adminDashboardRepository, type DashboardDateRanges } from './adminDashboard.repository';
import type {
  GetAdminDashboardAlertsInput,
  GetAdminDashboardOverviewInput,
} from './adminDashboard.schema';

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100.0 : 0.0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function resolveDateRanges(query: Partial<GetAdminDashboardOverviewInput> = {}): DashboardDateRanges {
  const now = new Date();

  if (query.startDate && query.endDate) {
    const currentStart = query.startDate;
    const currentEnd = query.endDate;
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  const period = query.period || 'thismonth';

  if (period === 'today') {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const currentEnd = now;
    const prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  if (period === 'last7days') {
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentEnd = now;
    const prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(currentStart.getTime() - 1);
    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  if (period === 'thisyear') {
    const currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const currentEnd = now;
    const prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    const prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { currentStart, currentEnd, prevStart, prevEnd };
  }

  // Default: 'thismonth'
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const currentEnd = now;
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { currentStart, currentEnd, prevStart, prevEnd };
}

function checkIntegrationConfig(id: string): boolean {
  switch (id) {
    case 'database':
      return Boolean(process.env.DATABASE_URL);
    case 'redis':
      return Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);
    case 'msg91':
      return Boolean(process.env.MSG91_AUTH_KEY || process.env.MSG91_API_KEY);
    case 'razorpay':
      return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    case 'exotel':
      return Boolean(
        (process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN) ||
        (process.env.EXOTEL_SID && process.env.EXOTEL_TOKEN),
      );
    default:
      return false;
  }
}

export const adminDashboardService = {
  async getExecutiveOverview(query: Partial<GetAdminDashboardOverviewInput> = {}) {
    const ranges = resolveDateRanges(query);
    const raw = await adminDashboardRepository.getExecutiveOverview(ranges);

    const userGrowthRate = calculateGrowth(
      raw.users.newInPeriod,
      raw.users.newPrevPeriod,
    );
    const orgGrowthRate = calculateGrowth(
      raw.organizations.newInPeriod,
      raw.organizations.newPrevPeriod,
    );

    return {
      period: query.period || 'thismonth',
      dateRange: {
        start: ranges.currentStart.toISOString(),
        end: ranges.currentEnd.toISOString(),
      },
      metrics: {
        users: {
          total: raw.users.total,
          active: raw.users.active,
          inactive: raw.users.inactive,
          superAdmins: raw.users.superAdmins,
          newInPeriod: raw.users.newInPeriod,
          growthRate: userGrowthRate,
        },
        organizations: {
          total: raw.organizations.total,
          active: raw.organizations.active,
          inactive: raw.organizations.inactive,
          newInPeriod: raw.organizations.newInPeriod,
          growthRate: orgGrowthRate,
        },
        memberships: {
          total: raw.memberships.total,
          active: raw.memberships.active,
          byRole: raw.memberships.byRole,
        },
        crm: {
          totalCustomers: raw.crm.totalCustomers,
          totalLeads: raw.crm.totalLeads,
          wonDealValue: raw.crm.wonDealValue,
          leadsByStatus: raw.crm.leadsByStatus,
        },
        audit: {
          totalLogs: raw.audit.totalLogs,
          logsInPeriod: raw.audit.logsInPeriod,
        },
        sos: {
          total: raw.sos.total,
          active: raw.sos.active,
          pending: raw.sos.pending,
          acknowledged: raw.sos.acknowledged,
          escalated: raw.sos.escalated,
          resolved: raw.sos.resolved,
          recent: raw.sos.recent,
        },
        vehicles: {
          total: raw.vehicles.total,
        },
        gpsDevices: {
          total: raw.gpsDevices?.total ?? 0,
          active: raw.gpsDevices?.active ?? 0,
        },
        products: {
          total: raw.products?.total ?? 0,
          active: raw.products?.active ?? 0,
        },
        subscriptions: {
          total: raw.subscriptions?.total ?? 0,
          active: raw.subscriptions?.active ?? 0,
        },
        totalSubscriptions: raw.subscriptions?.total ?? 0,
        activeSubscriptions: raw.subscriptions?.active ?? 0,
        qrCodes: {
          total: raw.qrCodes?.total ?? 0,
          active: raw.qrCodes?.active ?? 0,
        },
        activeQrCodes: raw.qrCodes?.active ?? 0,
        orders: {
          total: raw.orders?.total ?? 0,
          paid: raw.orders?.paid ?? 0,
          revenue: raw.orders?.revenue ?? 0,
        },
        totalOrders: raw.orders?.total ?? 0,
        totalRevenue: raw.orders?.revenue ?? 0,
      },
      recentActivity: raw.audit.recent,
      unimplementedDomains: {
        qrCodes: { status: 'BUILT', reason: 'QR Code management domain implemented' },
        orders: { status: 'BUILT', reason: 'Hardware orders domain implemented' },
        subscriptions: { status: 'BUILT', reason: 'Consumer subscriptions domain implemented in Phase 3E.3' },
        payments: { status: 'NOT_YET_BUILT', reason: 'Domain schema not yet created' },
      },
    };
  },

  async getOperationalAlerts(query: GetAdminDashboardAlertsInput) {
    const raw = await adminDashboardRepository.getOperationalAlerts(query.limit);

    interface AlertItem {
      id: string;
      type: string;
      severity: 'info' | 'warning' | 'danger';
      title: string;
      message: string;
      entityType: string;
      entityId: string;
      timestamp: Date;
    }

    const alerts: AlertItem[] = [];

    // 1. Inactive organization alerts
    for (const org of raw.deactivatedOrgs) {
      alerts.push({
        id: `alert_org_inactive_${org.id}`,
        type: 'ORGANIZATION_DEACTIVATED',
        severity: 'warning',
        title: `Deactivated Organization: ${org.name}`,
        message: `Organization '${org.name}' (${org.slug}) is currently suspended. Tenant users cannot access services.`,
        entityType: 'Organization',
        entityId: org.id,
        timestamp: org.updatedAt,
      });
    }

    // 2. Inactive user alerts
    for (const usr of raw.deactivatedUsers) {
      alerts.push({
        id: `alert_usr_inactive_${usr.id}`,
        type: 'USER_DEACTIVATED',
        severity: 'info',
        title: `Deactivated User: ${usr.email}`,
        message: `Account for ${usr.firstName} ${usr.lastName} (${usr.email}) is currently inactive.`,
        entityType: 'User',
        entityId: usr.id,
        timestamp: usr.updatedAt,
      });
    }

    // 3. Critical audit alerts
    for (const evt of raw.criticalAuditEvents) {
      alerts.push({
        id: `alert_audit_${evt.id}`,
        type: 'CRITICAL_AUDIT_ACTION',
        severity: 'warning',
        title: `Privileged action: ${evt.action}`,
        message: `Action '${evt.action}' executed on ${evt.entity} (${evt.entityId}) by ${evt.actor?.email || 'system'}.`,
        entityType: evt.entity,
        entityId: evt.entityId || evt.id,
        timestamp: evt.createdAt,
      });
    }

    // 4. Active SOS emergency alerts
    for (const sos of raw.activeSosEvents) {
      const isEscalated = sos.status === 'ESCALATED';
      const userDisplay = sos.user
        ? `${sos.user.firstName} ${sos.user.lastName} (${sos.user.email})`
        : 'Unknown user';
      alerts.push({
        id: `alert_sos_${sos.id}`,
        type: isEscalated ? 'SOS_ESCALATED' : 'SOS_PENDING',
        severity: isEscalated ? 'danger' : 'warning',
        title: isEscalated
          ? `Escalated SOS Emergency: ${sos.vehicleReg || 'Vehicle'}`
          : `Active SOS Incident: ${sos.vehicleReg || 'Vehicle'}`,
        message: isEscalated
          ? `SOS incident ${sos.id} has been escalated and requires immediate intervention. User: ${userDisplay}.`
          : `SOS incident ${sos.id} is pending response. User: ${userDisplay}.`,
        entityType: 'SosEvent',
        entityId: sos.id,
        timestamp: sos.createdAt,
      });
    }

    // Sort alerts by timestamp descending
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Filter by severity if specified
    const filteredAlerts = query.severity
      ? alerts.filter((a) => a.severity === query.severity)
      : alerts;

    const limitedAlerts = filteredAlerts.slice(0, query.limit);

    const counts = {
      total: alerts.length,
      filtered: filteredAlerts.length,
      bySeverity: {
        info: alerts.filter((a) => a.severity === 'info').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        danger: alerts.filter((a) => a.severity === 'danger').length,
      },
    };

    return {
      alerts: limitedAlerts,
      counts,
    };
  },

  async getSystemHealth() {
    const dbHealth = await adminDashboardRepository.checkDatabaseHealth();

    const overallStatus = dbHealth.isHealthy ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.isHealthy ? 'connected' : 'disconnected',
          latencyMs: dbHealth.latencyMs,
          engine: 'PostgreSQL',
        },
        server: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memoryUsage: {
            heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          },
        },
      },
      integrations: [
        {
          id: 'database',
          name: 'PostgreSQL',
          role: 'Primary Relational Database',
          status: dbHealth.isHealthy ? 'connected' : 'disconnected',
          configured: checkIntegrationConfig('database'),
          verifiedLive: true,
        },
        {
          id: 'redis',
          name: 'Redis',
          role: 'Cache & Session Store',
          status: checkIntegrationConfig('redis') ? 'configured' : 'pending_configuration',
          configured: checkIntegrationConfig('redis'),
          verifiedLive: false,
        },
        {
          id: 'msg91',
          name: 'MSG91',
          role: 'SMS & OTP Provider',
          status: checkIntegrationConfig('msg91') ? 'configured' : 'pending_configuration',
          configured: checkIntegrationConfig('msg91'),
          verifiedLive: false,
        },
        {
          id: 'razorpay',
          name: 'Razorpay',
          role: 'Payment Gateway',
          status: checkIntegrationConfig('razorpay') ? 'configured' : 'pending_configuration',
          configured: checkIntegrationConfig('razorpay'),
          verifiedLive: false,
        },
        {
          id: 'exotel',
          name: 'Exotel',
          role: 'Masked Calling & Telephony',
          status: checkIntegrationConfig('exotel') ? 'configured' : 'pending_configuration',
          configured: checkIntegrationConfig('exotel'),
          verifiedLive: false,
        },
      ],
    };
  },
};
