import { LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export const adminCrmRepository = {
  async getOverviewStats(startOfDay: Date) {
    const [totalLeads, wonLeads, callsToday, rawFunnel] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: LeadStatus.WON } }),
      prisma.callRecord.count({
        where: {
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      totalLeads,
      wonLeads,
      callsToday,
      rawFunnel,
    };
  },

  async listCalls(options: {
    skip: number;
    take: number;
    search?: string;
    type?: string;
    status?: string;
  }) {
    const where: Prisma.CallRecordWhereInput = {};

    if (options.type) {
      where.type = {
        equals: options.type.toUpperCase(),
        mode: 'insensitive',
      };
    }

    if (options.status) {
      where.status = {
        equals: options.status,
        mode: 'insensitive',
      };
    }

    const term = options.search?.trim();
    if (term) {
      where.OR = [
        {
          customer: {
            name: {
              contains: term,
              mode: 'insensitive',
            },
          },
        },
        {
          customer: {
            phone: {
              contains: term,
              mode: 'insensitive',
            },
          },
        },
        {
          lead: {
            name: {
              contains: term,
              mode: 'insensitive',
            },
          },
        },
        {
          lead: {
            phone: {
              contains: term,
              mode: 'insensitive',
            },
          },
        },
        {
          notes: {
            contains: term,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.callRecord.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
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
      prisma.callRecord.count({ where }),
    ]);

    return { items, total };
  },

  async listLeads(options: {
    skip: number;
    take: number;
    search?: string;
    status?: LeadStatus;
  }) {
    const where: Prisma.LeadWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }

    const term = options.search?.trim();
    if (term) {
      where.OR = [
        {
          name: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          company: {
            contains: term,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              name: true,
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
      prisma.lead.count({ where }),
    ]);

    return { items, total };
  },
};
