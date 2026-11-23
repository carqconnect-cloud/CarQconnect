import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { adminSupportRepository } from './adminSupport.repository';
import type {
  AssignTicketInput,
  CreateTicketMessageInput,
  ListTicketsQueryInput,
  UpdateTicketStatusInput,
} from './adminSupport.schema';

export const adminSupportService = {
  async listTickets(query: ListTicketsQueryInput) {
    const where: Prisma.SupportTicketWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.unassigned === true) {
      where.assignedToId = null;
    } else if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (typeof query.aiEscalated === 'boolean') {
      where.aiEscalated = query.aiEscalated;
    }

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { id: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [items, total] = await Promise.all([
      adminSupportRepository.findTickets({ where, skip, take }),
      adminSupportRepository.countTickets(where),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  },

  async getTicketById(id: string) {
    const ticket = await adminSupportRepository.findTicketById(id);
    if (!ticket) {
      throw ApiError.notFound('Support ticket');
    }
    return ticket;
  },

  async updateStatus(
    id: string,
    input: UpdateTicketStatusInput,
    actorId?: string,
    actorEmail?: string,
  ) {
    const ticket = await adminSupportRepository.findTicketById(id);
    if (!ticket) {
      throw ApiError.notFound('Support ticket');
    }

    const previousStatus = ticket.status;
    const newStatus = input.status;

    if (previousStatus === newStatus) {
      return ticket;
    }

    return prisma.$transaction(async (tx) => {
      let resolvedAt: Date | null = ticket.resolvedAt;
      let isReopening = false;

      if (previousStatus === 'RESOLVED') {
        // Reopening from RESOLVED: clear resolvedAt
        resolvedAt = null;
        isReopening = true;
      } else if (newStatus === 'RESOLVED') {
        // Resolving: set resolvedAt timestamp
        resolvedAt = new Date();
      }

      const updated = await adminSupportRepository.updateTicket(
        id,
        {
          status: newStatus,
          resolvedAt,
        },
        tx,
      );

      await auditService.record(
        {
          action: 'support_ticket.status_updated',
          entity: 'SupportTicket',
          entityId: id,
          organizationId: ticket.organizationId,
          actorId,
          metadata: {
            previousStatus,
            newStatus,
            reopened: isReopening,
            resolvedAt: resolvedAt ? resolvedAt.toISOString() : null,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async assignTicket(
    id: string,
    input: AssignTicketInput,
    actorId?: string,
    actorEmail?: string,
  ) {
    const ticket = await adminSupportRepository.findTicketById(id);
    if (!ticket) {
      throw ApiError.notFound('Support ticket');
    }

    const previousAssignedToId = ticket.assignedToId;

    if (input.assignedToId === null) {
      // Unassignment
      return prisma.$transaction(async (tx) => {
        const updated = await adminSupportRepository.updateTicket(
          id,
          { assignedToId: null },
          tx,
        );

        await auditService.record(
          {
            action: 'support_ticket.assigned',
            entity: 'SupportTicket',
            entityId: id,
            organizationId: ticket.organizationId,
            actorId,
            metadata: {
              previousAssignedToId,
              newAssignedToId: null,
              unassigned: true,
              actorId,
              actorEmail,
            },
          },
          tx,
        );

        return updated;
      });
    }

    // Assigning to a user: enforce active Super Admin predicate
    const candidate = await adminSupportRepository.findUserById(input.assignedToId);
    if (!candidate || !candidate.isActive) {
      throw ApiError.badRequest('Assigned user does not exist or is inactive');
    }

    if (!candidate.isSuperAdmin) {
      throw ApiError.badRequest('Only platform Super Admins may be assigned to support tickets');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminSupportRepository.updateTicket(
        id,
        { assignedToId: input.assignedToId },
        tx,
      );

      await auditService.record(
        {
          action: 'support_ticket.assigned',
          entity: 'SupportTicket',
          entityId: id,
          organizationId: ticket.organizationId,
          actorId,
          metadata: {
            previousAssignedToId,
            newAssignedToId: input.assignedToId,
            assigneeEmail: candidate.email,
            unassigned: false,
            actorId,
            actorEmail,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async addMessage(
    id: string,
    input: CreateTicketMessageInput,
    actorId?: string,
  ) {
    const ticket = await adminSupportRepository.findTicketById(id);
    if (!ticket) {
      throw ApiError.notFound('Support ticket');
    }

    const message = await adminSupportRepository.createTicketMessage({
      ticketId: id,
      message: input.message,
      senderType: 'ADMIN',
      senderId: actorId ?? null,
    });

    return message;
  },

  async validateIdentityInvariants(
    data: {
      organizationId?: string | null;
      customerId?: string | null;
      userId?: string | null;
      vehicleId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    // Invariant 1: Customer Organization Scope
    if (data.customerId) {
      if (!data.organizationId) {
        throw ApiError.badRequest('customerId requires an organizationId');
      }
      const customer = await adminSupportRepository.findCustomerById(data.customerId, tx);
      if (!customer || customer.organizationId !== data.organizationId) {
        throw ApiError.badRequest('Customer does not belong to the specified organization');
      }
    }

    // Invariant 2 & 3: Vehicle / User Ownership & CRM Ticket Vehicle Exclusion
    if (data.vehicleId) {
      if (!data.userId) {
        throw ApiError.badRequest('vehicleId requires a platform userId');
      }
      const vehicle = await adminSupportRepository.findVehicleById(data.vehicleId, tx);
      if (!vehicle || vehicle.userId !== data.userId) {
        throw ApiError.badRequest('Vehicle does not belong to the specified user');
      }
    }
  },

  async listAiEscalations(query: ListTicketsQueryInput) {
    return this.listTickets({
      ...query,
      aiEscalated: true,
    });
  },

  async getAnalytics() {
    const counts = await adminSupportRepository.getAnalyticsCounts();

    return {
      totalTickets: counts.totalTickets,
      openTickets: counts.openTickets,
      inProgressTickets: counts.inProgressTickets,
      escalatedTickets: counts.escalatedTickets,
      resolvedTickets: counts.resolvedTickets,
      aiEscalatedCount: counts.aiEscalatedCount,
      unassignedCount: counts.unassignedCount,
      byCategory: counts.byCategory,
      byPriority: counts.byPriority,
      firstResponse: {
        percentage: null,
        status: 'UNCONFIGURED',
        reason: 'Authoritative SLA window not defined',
      },
      aiContainment: {
        percentage: null,
        status: 'UNAVAILABLE',
        reason: 'Customer AI conversation data deferred',
      },
    };
  },
};
