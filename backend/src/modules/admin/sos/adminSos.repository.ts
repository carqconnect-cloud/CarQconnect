import { Prisma, SosEventStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import type { ListAdminSosQuery } from './adminSos.schema';

export const adminSosRepository = {
  async listIncidents(query: ListAdminSosQuery) {
    const { page, limit, tab, status, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SosEventWhereInput = {};

    if (status) {
      where.status = status;
    } else if (tab === 'active') {
      where.status = {
        in: [SosEventStatus.PENDING, SosEventStatus.ACKNOWLEDGED, SosEventStatus.ESCALATED],
      };
    } else if (tab === 'history') {
      where.status = SosEventStatus.RESOLVED;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { vehicleReg: { contains: term, mode: 'insensitive' } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total, pendingCount, ackCount, escCount, resCount] = await Promise.all([
      prisma.sosEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [sortBy]: sortOrder }, { id: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
          contactsNotified: {
            select: {
              id: true,
              name: true,
              phone: true,
              isNotified: true,
              notifiedAt: true,
              isAcknowledged: true,
              acknowledgedAt: true,
            },
          },
        },
      }),
      prisma.sosEvent.count({ where }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.PENDING } }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.ACKNOWLEDGED } }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.ESCALATED } }),
      prisma.sosEvent.count({ where: { status: SosEventStatus.RESOLVED } }),
    ]);

    return {
      items,
      total,
      counts: {
        total: pendingCount + ackCount + escCount + resCount,
        active: pendingCount + ackCount + escCount,
        pending: pendingCount,
        acknowledged: ackCount,
        escalated: escCount,
        resolved: resCount,
      },
    };
  },

  async findById(id: string) {
    return prisma.sosEvent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
        resolvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contactsNotified: {
          orderBy: { createdAt: 'asc' },
        },
        timeline: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  },

  async updateStatusInTx(
    tx: Prisma.TransactionClient,
    id: string,
    data: {
      status: SosEventStatus;
      notes?: string;
      resolvedAt?: Date | null;
      resolvedById?: string | null;
    },
  ) {
    return tx.sosEvent.update({
      where: { id },
      data,
    });
  },

  async addTimelineItemInTx(
    tx: Prisma.TransactionClient,
    data: {
      eventId: string;
      label: string;
      actorId?: string;
    },
  ) {
    return tx.sosTimelineItem.create({
      data,
    });
  },

  async findContactById(eventId: string, contactId: string) {
    return prisma.sosEventContact.findFirst({
      where: {
        id: contactId,
        eventId,
      },
    });
  },

  async updateContactNotificationInTx(
    tx: Prisma.TransactionClient,
    contactId: string,
    data: {
      isNotified: boolean;
      notifiedAt: Date;
    },
  ) {
    return tx.sosEventContact.update({
      where: { id: contactId },
      data,
    });
  },
};
