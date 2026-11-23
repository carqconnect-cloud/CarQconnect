import { ApiError } from '../../../common/utils/apiError';
import { customerRepository } from './customer.repository';
import type { CreateCustomerInput, ListCustomersInput, UpdateCustomerInput } from './customer.schema';

import { prisma } from '../../../config/database';
import { auditService } from '../../audit/audit.service';

export const customerService = {
  async list(orgId: string, input: ListCustomersInput) {
    const skip = (input.page - 1) * input.limit;
    const { items, total } = await customerRepository.findMany(orgId, skip, input.limit, input.search);

    return {
      items,
      meta: {
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  },

  async getById(orgId: string, id: string) {
    const customer = await customerRepository.findById(orgId, id);
    if (!customer) throw ApiError.notFound('Customer not found');
    return customer;
  },

  async create(orgId: string, data: CreateCustomerInput) {
    return customerRepository.create(orgId, data);
  },

  async update(orgId: string, id: string, data: UpdateCustomerInput) {
    await this.getById(orgId, id);
    // Since we don't have id_organizationId unique compound, we'll use a hack or just first find it.
    // We already found it, so we can just update it using updateMany since it's safer.
    // wait, customerRepository.update might fail if no unique. Let's fix that in repo.
    return customerRepository.update(orgId, id, data);
  },

  async remove(orgId: string, id: string, actorId?: string, ipAddress?: string) {
    const existing = await this.getById(orgId, id);
    await prisma.$transaction(async (tx) => {
      await customerRepository.delete(orgId, id, tx);
      await auditService.record(
        {
          organizationId: orgId,
          actorId,
          action: 'customer.deleted',
          entity: 'Customer',
          entityId: id,
          metadata: { name: existing.name },
          ipAddress,
        },
        tx,
      );
    });
  },
};
