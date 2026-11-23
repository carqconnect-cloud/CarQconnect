import { ApiError } from '../../../common/utils/apiError';
import {
  buildPaginationMeta,
  getPaginationArgs,
  getSortArgs,
} from '../../../common/utils/pagination';
import { prisma } from '../../../config/database';
import { auditService } from '../../audit/audit.service';
import { adminOrganizationRepository } from './adminOrganization.repository';
import {
  ADMIN_ORGANIZATION_SORTABLE_FIELDS,
  type ListAdminOrganizationsInput,
  type UpdateOrganizationStatusInput,
} from './adminOrganization.schema';

export interface UpdateOrganizationStatusServiceArgs {
  targetOrgId: string;
  actingAdminId: string;
  input: UpdateOrganizationStatusInput;
  ipAddress?: string;
}

export const adminOrganizationService = {
  async listOrganizations(query: Partial<ListAdminOrganizationsInput> = {}) {
    const pagination = getPaginationArgs(query);
    const orderBy = getSortArgs(query, ADMIN_ORGANIZATION_SORTABLE_FIELDS, 'createdAt');

    const { items, total } = await adminOrganizationRepository.listOrganizations({
      skip: pagination.skip,
      take: pagination.take,
      orderBy,
      search: query.search,
      isActive: query.isActive,
    });

    return {
      items,
      meta: buildPaginationMeta(total, pagination),
    };
  },

  async getOrganizationById(id: string) {
    const organization = await adminOrganizationRepository.findOrganizationById(id);
    if (!organization) {
      throw ApiError.notFound('Organization');
    }
    return organization;
  },

  async updateStatus({
    targetOrgId,
    actingAdminId,
    input,
    ipAddress,
  }: UpdateOrganizationStatusServiceArgs) {
    const organization = await adminOrganizationRepository.findOrganizationById(targetOrgId);
    if (!organization) {
      throw ApiError.notFound('Organization');
    }

    // Idempotency: if organization already has the requested status, return early without mutations or duplicate audit entries
    if (organization.isActive === input.isActive) {
      return organization;
    }

    const trimmedReason = input.reason?.trim();
    const reason = trimmedReason && trimmedReason.length > 0 ? trimmedReason : undefined;

    return prisma.$transaction(async (tx) => {
      const updated = await adminOrganizationRepository.updateOrganizationStatus(
        targetOrgId,
        input.isActive,
        tx,
      );

      await auditService.record(
        {
          organizationId: targetOrgId,
          actorId: actingAdminId,
          action: input.isActive
            ? 'admin.organization_reactivated'
            : 'admin.organization_deactivated',
          entity: 'Organization',
          entityId: targetOrgId,
          metadata: {
            previousStatus: organization.isActive,
            newStatus: input.isActive,
            ...(reason ? { reason } : {}),
          },
          ipAddress,
        },
        tx,
      );

      return updated;
    });
  },
};

export type AdminOrganizationService = typeof adminOrganizationService;
