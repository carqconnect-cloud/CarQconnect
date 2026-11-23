import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

export interface RecordAuditLogInput {
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

const SENSITIVE_KEY_PATTERN =
  /password|token|secret|hash|authorization|cookie|bearer|api[_-]?key/i;

function sanitizeValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  return sanitizeAuditMetadata(value as Record<string, unknown>);
}

/**
 * Recursively strips sensitive properties (passwords, tokens, secrets)
 * from audit log metadata payloads to prevent credential leakage.
 * Handles deeply nested objects and arrays of objects.
 */
export function sanitizeAuditMetadata(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue; // Skip sensitive keys entirely
    }

    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

export const auditService = {
  /**
   * Records an audit event for privileged, security-sensitive, or destructive actions.
   * Supports optional Prisma transaction client for atomic execution with business mutations.
   */
  async record(
    input: RecordAuditLogInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    const sanitizedMetadata: Record<string, unknown> = {
      ...(sanitizeAuditMetadata(input.metadata) || {}),
    };

    let actorId = input.actorId ?? null;
    if (actorId) {
      const userExists = await client.user.findUnique({ where: { id: actorId }, select: { id: true } });
      if (!userExists) {
        sanitizedMetadata.crmActorId = actorId;
        actorId = null;
      }
    }

    try {
      const entry = await client.auditLog.create({
        data: {
          organizationId: input.organizationId ?? null,
          actorId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          metadata: (sanitizedMetadata as Prisma.InputJsonValue) ?? undefined,
          ipAddress: input.ipAddress ?? null,
        },
      });

      logger.info(
        {
          auditLogId: entry.id,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          organizationId: entry.organizationId,
          actorId: entry.actorId,
        },
        'Audit log recorded',
      );

      return entry;
    } catch (error) {
      logger.error(
        {
          err: error,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          organizationId: input.organizationId,
          actorId: input.actorId,
        },
        'Failed to record audit log',
      );
      throw error;
    }
  },

  /**
   * Lists audit logs for an organization with optional entity and action filtering.
   */
  async list(
    organizationId?: string | null,
    options?: {
      entity?: string;
      action?: string;
      actorId?: string;
      limit?: number;
      skip?: number;
    },
  ) {
    const where: Prisma.AuditLogWhereInput = {
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(options?.entity ? { entity: options.entity } : {}),
      ...(options?.action ? { action: options.action } : {}),
      ...(options?.actorId ? { actorId: options.actorId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.skip ?? 0,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },

  /**
   * Retrieves a single audit log entry by ID with tenant isolation verification.
   */
  async getById(id: string, organizationId?: string | null) {
    const where: Prisma.AuditLogWhereInput = {
      id,
      ...(organizationId !== undefined ? { organizationId } : {}),
    };

    return prisma.auditLog.findFirst({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },
};

export type AuditService = typeof auditService;
