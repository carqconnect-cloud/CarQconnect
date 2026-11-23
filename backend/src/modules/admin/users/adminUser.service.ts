import { ApiError } from '../../../common/utils/apiError';
import {
  buildPaginationMeta,
  getPaginationArgs,
  getSortArgs,
} from '../../../common/utils/pagination';
import { auditService } from '../../audit/audit.service';
import { adminUserRepository } from './adminUser.repository';
import {
  ADMIN_USER_SORTABLE_FIELDS,
  type CreateAdminUserInput,
  type ListAdminUsersInput,
  type UpdateAdminUserInput,
  type UpdateUserStatusInput,
} from './adminUser.schema';

export interface UpdateUserStatusServiceArgs {
  targetUserId: string;
  actingAdminId: string;
  input: UpdateUserStatusInput;
  ipAddress?: string;
}

export interface CreateAdminUserServiceArgs {
  actingAdminId: string;
  input: CreateAdminUserInput;
  ipAddress?: string;
}

export interface UpdateAdminUserProfileServiceArgs {
  targetUserId: string;
  actingAdminId: string;
  input: UpdateAdminUserInput;
  ipAddress?: string;
}

export const adminUserService = {
  async createUser({ actingAdminId, input, ipAddress }: CreateAdminUserServiceArgs) {
    const existing = await adminUserRepository.findCustomerByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('A customer with this email already exists');
    }

    const fullName = (input.name || `${input.firstName || ''} ${input.lastName || ''}`).trim() || input.email;

    const customer = await adminUserRepository.createCustomer({
      name: fullName,
      email: input.email,
      phone: input.phone?.trim() || null,
      company: input.company?.trim() || null,
      address: input.address?.trim() || null,
      metadata: {
        plan: input.plan || 'Starter (Free)',
        ...(input.metadata || {}),
      },
    });

    await auditService.record({
      actorId: actingAdminId,
      action: 'admin.customer_created',
      entity: 'Customer',
      entityId: customer.id,
      metadata: {
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
      },
      ipAddress,
    });

    return customer;
  },

  async listUsers(query: Partial<ListAdminUsersInput> = {}) {
    const pagination = getPaginationArgs(query);
    const orderBy = getSortArgs(query, ADMIN_USER_SORTABLE_FIELDS, 'createdAt');

    const { items, total } = await adminUserRepository.listCustomers({
      skip: pagination.skip,
      take: pagination.take,
      orderBy,
      search: query.search,
      plan: query.plan,
      health: query.health,
    });

    return {
      items,
      meta: buildPaginationMeta(total, pagination),
    };
  },

  async getUserDetail(id: string) {
    const customer = await adminUserRepository.findCustomerById(id);
    if (!customer) {
      throw ApiError.notFound('Customer');
    }
    return customer;
  },

  async updateProfile({
    targetUserId,
    actingAdminId,
    input,
    ipAddress,
  }: UpdateAdminUserProfileServiceArgs) {
    const existing = await adminUserRepository.findCustomerById(targetUserId);
    if (!existing) {
      throw ApiError.notFound('Customer');
    }

    const name = input.name || (input.firstName || input.lastName ? `${input.firstName || ''} ${input.lastName || ''}`.trim() : undefined);

    const updated = await adminUserRepository.updateCustomer(targetUserId, {
      name,
      email: input.email,
      phone: input.phone,
      company: input.company,
      address: input.address,
      metadata: {
        ...(input.plan ? { plan: input.plan } : {}),
        ...(input.health !== undefined ? { health: input.health } : {}),
        ...(input.metadata || {}),
      },
    });

    if (!updated) {
      throw ApiError.notFound('Customer');
    }

    await auditService.record({
      actorId: actingAdminId,
      action: 'admin.customer_updated',
      entity: 'Customer',
      entityId: updated.id,
      metadata: {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      },
      ipAddress,
    });

    return updated;
  },

  async updateStatus({
    targetUserId,
    actingAdminId,
    input,
    ipAddress,
  }: UpdateUserStatusServiceArgs) {
    const existing = await adminUserRepository.findCustomerById(targetUserId);
    if (!existing) {
      throw ApiError.notFound('Customer');
    }

    const updated = await adminUserRepository.updateCustomer(targetUserId, {
      metadata: {
        status: input.isActive ? 'ACTIVE' : 'SUSPENDED',
        isActive: input.isActive,
      },
    });

    await auditService.record({
      actorId: actingAdminId,
      action: input.isActive ? 'admin.customer_reactivated' : 'admin.customer_suspended',
      entity: 'Customer',
      entityId: targetUserId,
      metadata: { reason: input.reason, isActive: input.isActive },
      ipAddress,
    });

    return updated;
  },

  async deleteCustomer({
    targetUserId,
    actingAdminId,
    ipAddress,
  }: {
    targetUserId: string;
    actingAdminId: string;
    ipAddress?: string;
  }) {
    const existing = await adminUserRepository.findCustomerById(targetUserId);
    if (!existing) {
      throw ApiError.notFound('Customer');
    }

    await adminUserRepository.deleteCustomer(targetUserId);

    await auditService.record({
      actorId: actingAdminId,
      action: 'admin.customer_deleted',
      entity: 'Customer',
      entityId: targetUserId,
      metadata: { email: existing.email, name: existing.name },
      ipAddress,
    });

    return { success: true };
  },

  async getStats() {
    return adminUserRepository.getCustomerStats();
  },
};
