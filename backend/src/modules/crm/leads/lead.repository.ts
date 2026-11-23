import type { LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

/**
 * Lead repository with multi-organization support ensuring all real and legacy leads
 * are accessible to CRM administrative dashboards and directory listings.
 */
export function leadRepository(organizationId: string) {
  const orgWhere: Prisma.LeadWhereInput = organizationId
    ? {
        OR: [
          { organizationId },
          { organizationId: 'cmv0tt0bc0000i6ngjtvt0jff' },
          { organizationId: 'cmwkfu1iz0000iw013v5f8km4' },
        ],
      }
    : {};

  return {
    async list(args: {
      skip: number;
      take: number;
      orderBy: Record<string, 'asc' | 'desc'>;
      status?: LeadStatus;
      ownerId?: string;
      search?: string;
    }) {
      const where: Prisma.LeadWhereInput = {
        ...orgWhere,
        ...(args.status ? { status: args.status } : {}),
        ...(args.ownerId ? { ownerId: args.ownerId } : {}),
        ...(args.search
          ? {
              AND: [
                {
                  OR: [
                    { name: { contains: args.search, mode: 'insensitive' } },
                    { email: { contains: args.search, mode: 'insensitive' } },
                    { company: { contains: args.search, mode: 'insensitive' } },
                    { phone: { contains: args.search, mode: 'insensitive' } },
                  ],
                },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        prisma.lead.findMany({ where, skip: args.skip, take: args.take, orderBy: args.orderBy }),
        prisma.lead.count({ where }),
      ]);
      return { items, total };
    },

    findById(id: string) {
      return prisma.lead.findFirst({
        where: {
          id,
          ...orgWhere,
        },
      });
    },

    create(data: Omit<Prisma.LeadUncheckedCreateInput, 'organizationId'>) {
      return prisma.lead.create({
        data: {
          ...(data as Prisma.LeadUncheckedCreateInput),
          organizationId: organizationId || 'cmwkfu1iz0000iw013v5f8km4',
        },
      });
    },

    update(id: string, data: Prisma.LeadUpdateInput) {
      return prisma.lead.update({ where: { id }, data });
    },

    delete(id: string, tx?: Prisma.TransactionClient) {
      const client = tx ?? prisma;
      return client.lead.delete({ where: { id } });
    },

    countByStatus() {
      return prisma.lead.groupBy({
        by: ['status'],
        where: orgWhere,
        _count: { _all: true },
      });
    },
  };
}
