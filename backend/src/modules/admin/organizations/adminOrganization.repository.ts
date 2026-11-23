import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export interface ListAdminOrganizationsRepoArgs {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
  search?: string;
  isActive?: boolean;
}

export const adminOrganizationRepository = {
  async listOrganizations(args: ListAdminOrganizationsRepoArgs) {
    const where: Prisma.OrganizationWhereInput = {
      ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
      ...(args.search
        ? {
            OR: [
              { name: { contains: args.search, mode: 'insensitive' } },
              { slug: { contains: args.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [organizations, total] = await prisma.$transaction([
      prisma.organization.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: args.orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              memberships: true,
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return { items: organizations, total };
  },

  async findOrganizationById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });
  },

  async updateOrganizationStatus(id: string, isActive: boolean, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.organization.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
};

export type AdminOrganizationRepository = typeof adminOrganizationRepository;
