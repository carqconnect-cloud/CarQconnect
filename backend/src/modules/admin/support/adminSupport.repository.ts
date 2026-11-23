import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export const adminSupportRepository = {
  async findTickets(params: {
    where: Prisma.SupportTicketWhereInput;
    skip: number;
    take: number;
  }) {
    return prisma.supportTicket.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        subject: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        aiEscalated: true,
        aiSummary: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        customerId: true,
        userId: true,
        vehicleId: true,
        assignedToId: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            reg: true,
            model: true,
            fuel: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  },

  async countTickets(where: Prisma.SupportTicketWhereInput) {
    return prisma.supportTicket.count({ where });
  },

  async findTicketById(id: string) {
    return prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            reg: true,
            model: true,
            fuel: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    });
  },

  async updateTicket(
    id: string,
    data: Prisma.SupportTicketUpdateInput | Prisma.SupportTicketUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.supportTicket.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            reg: true,
            model: true,
            fuel: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  async createTicketMessage(
    data: Prisma.TicketMessageUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.ticketMessage.create({
      data,
    });
  },

  async findUserById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isSuperAdmin: true,
      },
    });
  },

  async findCustomerById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.customer.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
      },
    });
  },

  async findVehicleById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.vehicle.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });
  },

  async getAnalyticsCounts() {
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      escalatedTickets,
      resolvedTickets,
      aiEscalatedCount,
      unassignedCount,
      categoryGroups,
      priorityGroups,
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { status: 'ESCALATED' } }),
      prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { aiEscalated: true } }),
      prisma.supportTicket.count({
        where: {
          assignedToId: null,
          status: { not: 'RESOLVED' },
        },
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
      prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: { _all: true },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const group of categoryGroups) {
      byCategory[group.category] = group._count._all;
    }

    const byPriority: Record<string, number> = {};
    for (const group of priorityGroups) {
      byPriority[group.priority] = group._count._all;
    }

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      escalatedTickets,
      resolvedTickets,
      aiEscalatedCount,
      unassignedCount,
      byCategory,
      byPriority,
    };
  },
};
