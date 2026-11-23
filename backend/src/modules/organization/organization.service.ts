import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/apiError';
import { auditService } from '../audit/audit.service';
import type { UpdateOrganizationInput } from './organization.schema';

export const organizationService = {
  async get(organizationId: string) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { _count: { select: { memberships: true, leads: true } } },
    });
    if (!organization) throw ApiError.notFound('Organization');
    return organization;
  },

  async update(
    organizationId: string,
    input: UpdateOrganizationInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({ where: { id: organizationId }, data: input });
      await auditService.record(
        {
          organizationId,
          actorId: actorUserId,
          action: 'organization.updated',
          entity: 'Organization',
          entityId: organizationId,
          metadata: { ...input },
          ipAddress,
        },
        tx,
      );
      return updated;
    });
  },
};
