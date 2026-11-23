import {
  buildPaginationMeta,
  getPaginationArgs,
  getSortArgs,
} from '../../../common/utils/pagination';
import { adminAuditLogRepository } from './adminAuditLog.repository';
import {
  ADMIN_AUDIT_LOG_SORTABLE_FIELDS,
  type ListAdminAuditLogsInput,
} from './adminAuditLog.schema';

export const adminAuditLogService = {
  async listAuditLogs(query: Partial<ListAdminAuditLogsInput> = {}) {
    const pagination = getPaginationArgs(query);
    const orderBy = getSortArgs(query, ADMIN_AUDIT_LOG_SORTABLE_FIELDS, 'createdAt');

    const { items, total } = await adminAuditLogRepository.listAuditLogs({
      skip: pagination.skip,
      take: pagination.take,
      orderBy,
      search: query.search,
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      actorId: query.actorId,
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return {
      items,
      meta: buildPaginationMeta(total, pagination),
    };
  },

  async exportCsv(query: Partial<ListAdminAuditLogsInput> = {}) {
    const { items } = await adminAuditLogRepository.listAuditLogs({
      skip: 0,
      take: 5000,
      orderBy: { createdAt: 'desc' },
      search: query.search,
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      actorId: query.actorId,
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const headers = ['Time', 'Admin Name', 'Admin Email', 'Action', 'Module', 'Target ID', 'IP Address', 'Status'];
    const rows = items.map((l) => {
      const actorName = l.actor ? `${l.actor.firstName || ''} ${l.actor.lastName || ''}`.trim() || l.actor.email : 'System';
      const actorEmail = l.actor?.email || '';
      const action = l.action || 'UNKNOWN';
      const mod = l.entity || 'System';
      const targetId = l.entityId || '';
      const ip = l.ipAddress || '—';
      const status = 'success';
      const time = l.createdAt ? new Date(l.createdAt).toISOString() : '';
      return [
        `"${time}"`,
        `"${actorName.replace(/"/g, '""')}"`,
        `"${actorEmail.replace(/"/g, '""')}"`,
        `"${action.replace(/"/g, '""')}"`,
        `"${mod.replace(/"/g, '""')}"`,
        `"${targetId.replace(/"/g, '""')}"`,
        `"${ip.replace(/"/g, '""')}"`,
        `"${status}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },
};
