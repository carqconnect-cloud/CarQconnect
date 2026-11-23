import { ApiError } from '../../../common/utils/apiError';
import {
  buildPaginationMeta,
  getPaginationArgs,
  getSortArgs,
} from '../../../common/utils/pagination';
import { teamRepository } from './team.repository';
import type { CreateTeamInput, ListTeamsInput, UpdateTeamInput } from './team.schema';

import { prisma } from '../../../config/database';
import { auditService } from '../../audit/audit.service';

const SORTABLE = ['createdAt', 'updatedAt', 'name', 'status'] as const;

export const teamService = {
  async list(organizationId: string, query: ListTeamsInput) {
    const pagination = getPaginationArgs(query as any);
    const { items, total } = await teamRepository(organizationId).list({
      skip: pagination.skip,
      take: pagination.take,
      orderBy: getSortArgs(query as any, SORTABLE, 'createdAt'),
      status: query.status,
    });
    return { items, meta: buildPaginationMeta(total, pagination) };
  },

  async getById(organizationId: string, id: string) {
    const team = await teamRepository(organizationId).findById(id);
    if (!team) throw ApiError.notFound('Team');
    return team;
  },

  create(organizationId: string, input: CreateTeamInput) {
    return teamRepository(organizationId).create(input);
  },

  async update(organizationId: string, id: string, input: UpdateTeamInput) {
    const repo = teamRepository(organizationId);
    const existing = await repo.findById(id);
    if (!existing) throw ApiError.notFound('Team');
    return repo.update(id, input);
  },

  async remove(organizationId: string, id: string, actorId?: string, ipAddress?: string) {
    const repo = teamRepository(organizationId);
    const existing = await repo.findById(id);
    if (!existing) throw ApiError.notFound('Team');

    await prisma.$transaction(async (tx) => {
      await repo.delete(id, tx);
      await auditService.record(
        {
          organizationId,
          actorId,
          action: 'team.deleted',
          entity: 'Team',
          entityId: id,
          metadata: { name: existing.name },
          ipAddress,
        },
        tx,
      );
    });
  },

  async getMetrics(organizationId: string, id: string, timeframe?: string) {
    const validTimeframes = ['today', 'last7days', 'lastmonth', 'lastyear'] as const;
    type ValidTimeframe = (typeof validTimeframes)[number];
    const tf: ValidTimeframe = (validTimeframes as readonly string[]).includes(timeframe ?? '')
      ? (timeframe as ValidTimeframe)
      : 'lastmonth';
    const metrics = await teamRepository(organizationId).getMetrics(id, tf);
    if (!metrics) throw ApiError.notFound('Team');
    return metrics;
  }
};
