import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { sanitizeAuditMetadata } from '../../audit/audit.service';

export interface ListAdminAuditLogsRepoArgs {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
  search?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const adminAuditLogRepository = {
  async listAuditLogs(args: ListAdminAuditLogsRepoArgs) {
    const where: Prisma.AuditLogWhereInput = {
      ...(args.action ? { action: args.action } : {}),
      ...(args.entity ? { entity: args.entity } : {}),
      ...(args.entityId ? { entityId: args.entityId } : {}),
      ...(args.actorId ? { actorId: args.actorId } : {}),
      ...(args.organizationId ? { organizationId: args.organizationId } : {}),
      ...(args.startDate || args.endDate
        ? {
            createdAt: {
              ...(args.startDate ? { gte: args.startDate } : {}),
              ...(args.endDate ? { lte: args.endDate } : {}),
            },
          }
        : {}),
      ...(args.search
        ? {
            OR: [
              { action: { contains: args.search, mode: 'insensitive' } },
              { entity: { contains: args.search, mode: 'insensitive' } },
              { entityId: { contains: args.search, mode: 'insensitive' } },
              { ipAddress: { contains: args.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const primaryOrder = args.orderBy;
    const orderEntries: Prisma.AuditLogOrderByWithRelationInput[] = [
      primaryOrder,
      { id: 'desc' },
    ];

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: orderEntries,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          organizationId: true,
          actorId: true,
          ipAddress: true,
          metadata: true,
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
      prisma.auditLog.count({ where }),
    ]);

    const items = logs.map((log) => ({
      ...log,
      metadata: sanitizeAuditMetadata(log.metadata as Record<string, unknown> | null),
    }));

    return { items, total };
  },
};
