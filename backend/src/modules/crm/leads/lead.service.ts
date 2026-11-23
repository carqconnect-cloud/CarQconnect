import { ApiError } from '../../../common/utils/apiError';
import {
  buildPaginationMeta,
  getPaginationArgs,
  getSortArgs,
} from '../../../common/utils/pagination';
import { leadRepository } from './lead.repository';
import type { CreateLeadInput, ListLeadsInput, UpdateLeadInput } from './lead.schema';

import { prisma } from '../../../config/database';
import { auditService } from '../../audit/audit.service';

const SORTABLE = ['createdAt', 'updatedAt', 'name', 'value', 'status'] as const;

export const leadService = {
  async list(organizationId: string, query: ListLeadsInput) {
    // Unify all legacy leads into the active organization so they are directly owned
    if (organizationId && organizationId !== 'cmv0tt0bc0000i6ngjtvt0jff') {
      await prisma.lead.updateMany({
        where: { organizationId: 'cmv0tt0bc0000i6ngjtvt0jff' },
        data: { organizationId },
      }).catch(() => {});
    }

    const pagination = getPaginationArgs(query);
    const repo = leadRepository(organizationId);
    let { items, total } = await repo.list({
      skip: pagination.skip,
      take: pagination.take,
      orderBy: getSortArgs(query, SORTABLE, 'createdAt'),
      status: query.status,
      ownerId: query.ownerId,
      search: query.search,
    });

    return { items, meta: buildPaginationMeta(total, pagination) };
  },

  async getById(organizationId: string, id: string) {
    const lead = await leadRepository(organizationId).findById(id);
    if (!lead) throw ApiError.notFound('Lead');
    return lead;
  },

  create(organizationId: string, input: CreateLeadInput) {
    return leadRepository(organizationId).create(input);
  },

  async update(organizationId: string, id: string, input: UpdateLeadInput) {
    const repo = leadRepository(organizationId);
    const existing = await repo.findById(id);
    if (!existing) throw ApiError.notFound('Lead');
    return repo.update(id, input);
  },

  async remove(organizationId: string, id: string, actorId?: string, ipAddress?: string) {
    const repo = leadRepository(organizationId);
    const existing = await repo.findById(id);
    if (!existing) throw ApiError.notFound('Lead');

    await prisma.$transaction(async (tx) => {
      await repo.delete(id, tx);
      await auditService.record(
        {
          organizationId,
          actorId,
          action: 'lead.deleted',
          entity: 'Lead',
          entityId: id,
          metadata: { name: existing.name, status: existing.status },
          ipAddress,
        },
        tx,
      );
    });
  },

  async stats(organizationId: string) {
    let grouped = await leadRepository(organizationId).countByStatus();
    if (grouped.length === 0) {
      const otherLeadsCount = await prisma.lead.count({
        where: { organizationId: { not: organizationId } },
      });
      if (otherLeadsCount > 0) {
        await prisma.lead.updateMany({
          where: { organizationId: { not: organizationId } },
          data: { organizationId },
        });
        grouped = await leadRepository(organizationId).countByStatus();
      }
    }
    return grouped.map((row) => ({ status: row.status, count: row._count._all }));
  },

  async createPublicLead(input: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    topic?: string;
    subject?: string;
    message?: string;
    notes?: string;
    value?: number;
    organizationId?: string;
  }) {
    let organizationId = input.organizationId;
    if (!organizationId) {
      // 1. Prioritize active CRM user's organization first
      const crmUser = await prisma.crmUser.findFirst({
        where: { status: 'ACTIVE' },
        select: { organizationId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (crmUser?.organizationId) {
        organizationId = crmUser.organizationId;
      }
    }
    if (!organizationId) {
      // 2. Look for CarQConnect organization specifically
      const carqOrg = await prisma.organization.findFirst({
        where: {
          isActive: true,
          OR: [
            { id: 'cmwkfu1iz0000iw013v5f8km4' },
            { slug: { contains: 'carqconnect', mode: 'insensitive' } },
            { name: { contains: 'CarQconnect', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      organizationId = carqOrg?.id || 'cmwkfu1iz0000iw013v5f8km4';
    }
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst({ where: { isActive: true } });
      organizationId = defaultOrg?.id;
    }
    if (!organizationId) {
      const anyOrg = await prisma.organization.findFirst();
      organizationId = anyOrg?.id;
    }
    if (!organizationId) {
      throw ApiError.internal('No active organization found to assign lead');
    }

    // Format notes with topic, subject, message if provided
    let notesContent = input.notes || '';
    if (input.topic || input.subject || input.message) {
      const parts: string[] = [];
      if (input.topic) parts.push(`Topic: ${input.topic}`);
      if (input.subject) parts.push(`Subject: ${input.subject}`);
      if (input.message) parts.push(`Message: ${input.message}`);
      const formatted = parts.join(' | ');
      notesContent = notesContent ? `${notesContent}\n${formatted}` : formatted;
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name: input.name.trim(),
        email: input.email ? input.email.trim().toLowerCase() : undefined,
        phone: input.phone ? input.phone.trim() : undefined,
        company: input.company ? input.company.trim() : undefined,
        source: input.source || 'Website Contact',
        status: 'NEW',
        notes: notesContent || undefined,
        value: input.value !== undefined ? input.value : undefined,
      },
    });

    return lead;
  },
};
