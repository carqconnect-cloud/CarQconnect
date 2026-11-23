import { auditService } from '../../audit/audit.service';
import { adminReportsRepository } from './adminReports.repository';
import type {
  ExportReportQueryInput,
  GetReportQueryInput,
  SupportedReportKey,
} from './adminReports.schema';

export interface ReportHeader {
  key: string;
  label: string;
}

export interface ReportDefinition {
  key: SupportedReportKey;
  label: string;
  headers: ReportHeader[];
}

export const REPORT_DEFINITIONS: Record<SupportedReportKey, ReportDefinition> = {
  users: {
    key: 'users',
    label: 'User growth',
    headers: [
      { key: 'id', label: 'User ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
      { key: 'role', label: 'Role' },
      { key: 'joined', label: 'Joined Date' },
      { key: 'lastLoginAt', label: 'Last Login' },
    ],
  },
  revenue: {
    key: 'revenue',
    label: 'Revenue',
    headers: [
      { key: 'orderNo', label: 'Order No' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerEmail', label: 'Customer Email' },
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'orderStatus', label: 'Order Status' },
      { key: 'payStatus', label: 'Payment Status' },
      { key: 'createdAt', label: 'Date' },
    ],
  },
  'qr-scans': {
    key: 'qr-scans',
    label: 'QR scans',
    headers: [
      { key: 'code', label: 'QR Code' },
      { key: 'batch', label: 'Batch' },
      { key: 'status', label: 'Status' },
      { key: 'scans', label: 'Scan Count' },
      { key: 'vehicleReg', label: 'Vehicle Reg' },
      { key: 'vehicleModel', label: 'Vehicle Model' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
  'device-activation': {
    key: 'device-activation',
    label: 'Device activations',
    headers: [
      { key: 'imei', label: 'IMEI' },
      { key: 'status', label: 'Status' },
      { key: 'battery', label: 'Battery %' },
      { key: 'signal', label: 'Signal' },
      { key: 'vehicleReg', label: 'Assigned Vehicle' },
      { key: 'lastSeen', label: 'Last Seen' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
  'membership-conv': {
    key: 'membership-conv',
    label: 'Membership conversion',
    headers: [
      { key: 'id', label: 'Subscription ID' },
      { key: 'userName', label: 'User Name' },
      { key: 'userEmail', label: 'User Email' },
      { key: 'planName', label: 'Plan Name' },
      { key: 'price', label: 'Price (INR)' },
      { key: 'status', label: 'Status' },
      { key: 'autoRenew', label: 'Auto Renew' },
      { key: 'startedAt', label: 'Started At' },
      { key: 'expiresAt', label: 'Expires At' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
  'support-volume': {
    key: 'support-volume',
    label: 'Support volume',
    headers: [
      { key: 'id', label: 'Ticket ID' },
      { key: 'subject', label: 'Subject' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'aiEscalated', label: 'AI Escalated' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerEmail', label: 'Customer Email' },
      { key: 'assignedTo', label: 'Assigned Staff' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'resolvedAt', label: 'Resolved At' },
    ],
  },
  'ai-containment': {
    key: 'ai-containment',
    label: 'AI containment',
    headers: [
      { key: 'componentType', label: 'Component Type' },
      { key: 'identifier', label: 'Identifier' },
      { key: 'title', label: 'Title / Prompt / Name' },
      { key: 'actionOrTool', label: 'Action / Tool' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Last Updated' },
    ],
  },
  'call-outcomes': {
    key: 'call-outcomes',
    label: 'Call outcomes',
    headers: [
      { key: 'id', label: 'Call ID' },
      { key: 'type', label: 'Type' },
      { key: 'customerOrLead', label: 'Customer / Lead' },
      { key: 'phone', label: 'Phone' },
      { key: 'durationSeconds', label: 'Duration (sec)' },
      { key: 'status', label: 'Outcome Status' },
      { key: 'notes', label: 'Notes' },
      { key: 'createdAt', label: 'Call Time' },
    ],
  },
};

/**
 * Regex matching any value starting with, or becoming formula-like after
 * leading whitespace or ASCII control characters: =, +, -, @, \t, \r.
 */
const FORMULA_TRIGGER_REGEX = /^[\s\x00-\x1f]*[=+\-@\t\r]/;

/**
 * Escapes a single CSV field following RFC 4180 standards and
 * sanitizes against spreadsheet formula injection (CWE-1236):
 * - Null/undefined -> empty string
 * - Dates -> ISO 8601 strings
 * - Booleans -> 'true'/'false'
 * - Numbers -> standard string representation (finite numbers are safe from formula execution)
 * - Strings with leading formula characters (=, +, -, @, \t, \r) or leading whitespace/control
 *   characters followed by formula markers are prepended with a single quote (') to force
 *   literal text rendering in spreadsheet applications.
 * - Strings with comma, double quotes, CR or LF are wrapped in double quotes,
 *   with any inner double quotes escaped as `""`.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : '';

  let str = String(val);

  // Formula injection mitigation (CWE-1236)
  if (FORMULA_TRIGGER_REGEX.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 escaping
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an array of objects into an RFC 4180 compliant CSV string.
 */
export function formatCsv(
  headers: ReportHeader[],
  rows: Record<string, unknown>[],
): string {
  const headerLine = headers.map((h) => escapeCsvField(h.label)).join(',');
  const rowLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h.key])).join(','),
  );
  return [headerLine, ...rowLines].join('\r\n');
}

export const adminReportsService = {
  /**
   * Retrieves summary row counts for all 8 operational reports.
   */
  async getReportsSummary() {
    const counts = await adminReportsRepository.getAllReportsSummary();
    return Object.entries(REPORT_DEFINITIONS).map(([key, def]) => ({
      key: def.key,
      label: def.label,
      totalCount: counts[key as SupportedReportKey] ?? 0,
    }));
  },

  /**
   * Queries report rows with filtering and pagination.
   */
  async getReportData(
    key: SupportedReportKey,
    filters: Partial<GetReportQueryInput> = {},
  ) {
    const def = REPORT_DEFINITIONS[key];
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 100;

    let rows: Record<string, unknown>[] = [];
    let total = 0;

    switch (key) {
      case 'users': {
        const result = await adminReportsRepository.getUsersReport(filters);
        total = result.total;
        rows = result.rows.map((u) => ({
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || 'N/A',
          email: u.email,
          phone: u.phone || '',
          status: u.isActive ? 'Active' : 'Suspended',
          role: u.isSuperAdmin ? 'Super Admin' : 'User',
          joined: u.createdAt ? u.createdAt.toISOString() : '',
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
        }));
        break;
      }
      case 'revenue': {
        const result = await adminReportsRepository.getRevenueReport(filters);
        total = result.total;
        rows = result.rows.map((o) => ({
          orderNo: o.orderNo,
          customerName:
            o.customerName ||
            (o.user
              ? [o.user.firstName, o.user.lastName].filter(Boolean).join(' ')
              : '') ||
            'N/A',
          customerEmail: o.customerEmail || o.user?.email || '',
          amount: typeof o.amount === 'number' ? o.amount : Number(o.amount || 0),
          currency: o.currency || 'INR',
          orderStatus: o.status,
          payStatus: o.payStatus,
          createdAt: o.createdAt ? o.createdAt.toISOString() : '',
        }));
        break;
      }
      case 'qr-scans': {
        const result = await adminReportsRepository.getQrScansReport(filters);
        total = result.total;
        rows = result.rows.map((q) => ({
          code: q.code,
          batch: q.batch || '',
          status: q.status,
          scans: q.scansCount ?? 0,
          vehicleReg: q.vehicle?.reg || 'Unassigned',
          vehicleModel: q.vehicle?.model || '',
          createdAt: q.createdAt ? q.createdAt.toISOString() : '',
        }));
        break;
      }
      case 'device-activation': {
        const result = await adminReportsRepository.getDeviceActivationReport(filters);
        total = result.total;
        rows = result.rows.map((g) => ({
          imei: g.imei,
          status: g.status,
          battery: g.batteryLevel ?? '',
          signal: g.signalStrength ?? '',
          vehicleReg: g.vehicle?.reg || 'Unassigned',
          lastSeen: g.lastSeenAt ? g.lastSeenAt.toISOString() : 'Never',
          createdAt: g.createdAt ? g.createdAt.toISOString() : '',
        }));
        break;
      }
      case 'membership-conv': {
        const result = await adminReportsRepository.getMembershipConversionReport(filters);
        total = result.total;
        rows = result.rows.map((s) => ({
          id: s.id,
          userName: s.user
            ? [s.user.firstName, s.user.lastName].filter(Boolean).join(' ')
            : 'N/A',
          userEmail: s.user?.email || '',
          planName: s.plan?.name || 'N/A',
          price: s.amountPaidInPaise
            ? s.amountPaidInPaise / 100
            : s.plan?.priceInPaise
              ? s.plan.priceInPaise / 100
              : 0,
          status: s.status,
          autoRenew: s.autoRenew ? 'Yes' : 'No',
          startedAt: s.startedAt ? s.startedAt.toISOString() : '',
          expiresAt: s.expiresAt ? s.expiresAt.toISOString() : '',
          createdAt: s.createdAt ? s.createdAt.toISOString() : '',
        }));
        break;
      }
      case 'support-volume': {
        const result = await adminReportsRepository.getSupportVolumeReport(filters);
        total = result.total;
        rows = result.rows.map((t) => ({
          id: t.id,
          subject: t.subject,
          category: t.category,
          priority: t.priority,
          status: t.status,
          aiEscalated: t.aiEscalated ? 'Yes' : 'No',
          customerName: t.customer?.name || 'N/A',
          customerEmail: t.customer?.email || '',
          assignedTo: t.assignedTo
            ? [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ')
            : 'Unassigned',
          createdAt: t.createdAt ? t.createdAt.toISOString() : '',
          resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : '',
        }));
        break;
      }
      case 'ai-containment': {
        const aiData = await adminReportsRepository.getAiGovernanceReport();
        const combined = [
          ...aiData.articles.map((a) => ({
            componentType: 'KNOWLEDGE_ARTICLE',
            identifier: a.id,
            title: a.question,
            actionOrTool: a.category,
            status: a.status,
            updatedAt: a.updatedAt ? a.updatedAt.toISOString() : '',
          })),
          ...aiData.intents.map((i) => ({
            componentType: 'INTENT',
            identifier: i.id,
            title: i.name,
            actionOrTool: i.tool,
            status: `Threshold: ${i.threshold}`,
            updatedAt: i.updatedAt ? i.updatedAt.toISOString() : '',
          })),
          ...aiData.tools.map((tp) => ({
            componentType: 'TOOL_PERMISSION',
            identifier: tp.id,
            title: tp.name,
            actionOrTool: tp.toolKey,
            status: `Read: ${tp.read}, Write: ${tp.write}`,
            updatedAt: tp.updatedAt ? tp.updatedAt.toISOString() : '',
          })),
          ...aiData.rules.map((r) => ({
            componentType: 'ESCALATION_RULE',
            identifier: r.id,
            title: r.condition,
            actionOrTool: r.action,
            status: r.active ? 'ACTIVE' : 'INACTIVE',
            updatedAt: r.updatedAt ? r.updatedAt.toISOString() : '',
          })),
        ];
        total = combined.length;
        const skip = (page - 1) * limit;
        rows = combined.slice(skip, skip + limit);
        break;
      }
      case 'call-outcomes': {
        const result = await adminReportsRepository.getCallOutcomesReport(filters);
        total = result.total;
        rows = result.rows.map((c) => ({
          id: c.id,
          type: c.type,
          customerOrLead: c.customer?.name || c.lead?.name || 'N/A',
          phone: c.customer?.phone || c.lead?.phone || '',
          durationSeconds: c.duration ?? 0,
          status: c.status,
          notes: c.notes || '',
          createdAt: c.createdAt ? c.createdAt.toISOString() : '',
        }));
        break;
      }
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      reportKey: key,
      label: def.label,
      headers: def.headers,
      rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  /**
   * Generates and exports an RFC 4180 compliant CSV string for a report,
   * and records an audit log entry.
   */
  async exportReportCsv(
    key: SupportedReportKey,
    filters: Partial<ExportReportQueryInput> = {},
    actorId?: string,
  ) {
    const def = REPORT_DEFINITIONS[key];
    const exportLimit = filters.limit ?? 5000;

    // Fetch full data up to export limit
    const reportData = await this.getReportData(key, {
      ...filters,
      page: 1,
      limit: exportLimit,
    });

    const csvContent = formatCsv(def.headers, reportData.rows);
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `${key}_report_${dateStamp}.csv`;

    // Audit logging for privileged operational data export
    await auditService.record({
      action: 'admin_report.exported',
      entity: 'Report',
      entityId: key,
      actorId,
      metadata: {
        reportKey: key,
        reportLabel: def.label,
        rowCount: reportData.rows.length,
        totalAvailable: reportData.pagination.total,
        format: 'csv',
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          status: filters.status,
          type: filters.type,
          category: filters.category,
          priority: filters.priority,
          search: filters.search,
        },
      },
    });

    return {
      filename,
      csvContent,
      rowCount: reportData.rows.length,
      totalAvailable: reportData.pagination.total,
    };
  },
};
