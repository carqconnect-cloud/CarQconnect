import { SosEventStatus } from '@prisma/client';
import { ApiError } from '../../../common/utils/apiError';
import { prisma } from '../../../config/database';
import { auditService } from '../../audit';
import { realTimeService } from '../../../common/services/socket.service';
import { adminSosRepository } from './adminSos.repository';
import type { ListAdminSosQuery, UpdateSosStatusInput } from './adminSos.schema';

async function getValidUserActorId(actorId?: string): Promise<string | undefined> {
  if (!actorId) return undefined;
  try {
    const user = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    });
    return user ? actorId : undefined;
  } catch {
    return undefined;
  }
}

export const adminSosService = {
  async listIncidents(query: ListAdminSosQuery) {
    const { items, total, counts } = await adminSosRepository.listIncidents(query);
    const totalPages = Math.ceil(total / query.limit) || 1;

    const formattedItems = items.map((item) => ({
      id: item.id,
      userId: item.userId,
      userName: `${item.user.firstName} ${item.user.lastName}`.trim(),
      userEmail: item.user.email,
      userPhone: item.user.phone,
      vehicleReg: item.vehicleReg,
      status: item.status,
      lat: item.lat,
      lng: item.lng,
      address: item.address,
      organization: item.organization
        ? {
            id: item.organization.id,
            name: item.organization.name,
            slug: item.organization.slug,
          }
        : null,
      contactsCount: item.contactsNotified.length,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return {
      items: formattedItems,
      counts,
      meta: {
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
          hasNextPage: query.page < totalPages,
          hasPreviousPage: query.page > 1,
        },
      },
    };
  },

  async getIncidentById(id: string) {
    const incident = await adminSosRepository.findById(id);
    if (!incident) {
      throw ApiError.notFound('SOS incident not found');
    }

    return {
      id: incident.id,
      userId: incident.userId,
      userName: `${incident.user.firstName} ${incident.user.lastName}`.trim(),
      userEmail: incident.user.email,
      userPhone: incident.user.phone,
      vehicleReg: incident.vehicleReg,
      status: incident.status,
      lat: incident.lat,
      lng: incident.lng,
      address: incident.address,
      notes: incident.notes,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
      resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
      resolvedBy: incident.resolvedBy
        ? {
            id: incident.resolvedBy.id,
            name: `${incident.resolvedBy.firstName} ${incident.resolvedBy.lastName}`.trim(),
            email: incident.resolvedBy.email,
          }
        : null,
      organization: incident.organization
        ? {
            id: incident.organization.id,
            name: incident.organization.name,
            slug: incident.organization.slug,
          }
        : null,
      contactsNotified: incident.contactsNotified.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        isNotified: c.isNotified,
        deliveryStatus: 'UNCONFIGURED_PROVIDER', // Explicitly reflects that SMS provider is unconfigured in this phase
        notifiedAt: c.notifiedAt ? c.notifiedAt.toISOString() : null,
        isAcknowledged: c.isAcknowledged,
        acknowledgedAt: c.acknowledgedAt ? c.acknowledgedAt.toISOString() : null,
      })),
      timeline: incident.timeline.map((t) => ({
        id: t.id,
        label: t.label,
        actor: t.actor
          ? {
              id: t.actor.id,
              name: `${t.actor.firstName} ${t.actor.lastName}`.trim(),
              email: t.actor.email,
            }
          : null,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  },

  async acknowledgeIncident(id: string, actingAdminId: string, ipAddress?: string) {
    const existing = await adminSosRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('SOS incident not found');
    }

    if (existing.status === SosEventStatus.ACKNOWLEDGED) {
      return this.getIncidentById(id);
    }

    if (existing.status === SosEventStatus.ESCALATED) {
      throw ApiError.badRequest('Cannot transition an escalated incident to acknowledged');
    }

    if (existing.status === SosEventStatus.RESOLVED) {
      throw ApiError.badRequest('Cannot acknowledge a resolved incident');
    }

    const validActorId = await getValidUserActorId(actingAdminId);

    await prisma.$transaction(async (tx) => {
      await adminSosRepository.updateStatusInTx(tx, id, {
        status: SosEventStatus.ACKNOWLEDGED,
      });

      await adminSosRepository.addTimelineItemInTx(tx, {
        eventId: id,
        label: 'Acknowledged by admin',
        actorId: validActorId,
      });

      await auditService.record(
        {
          organizationId: existing.organizationId ?? undefined,
          actorId: actingAdminId,
          action: 'admin.sos_acknowledged',
          entity: 'SosEvent',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: SosEventStatus.ACKNOWLEDGED,
          },
          ipAddress,
        },
        tx,
      );
    });

    realTimeService.broadcastSosAlert({
      id,
      userId: existing.userId,
      status: 'ACKNOWLEDGED',
    });

    return this.getIncidentById(id);
  },

  async escalateIncident(
    id: string,
    actingAdminId: string,
    notes?: string,
    ipAddress?: string,
  ) {
    const existing = await adminSosRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('SOS incident not found');
    }

    if (existing.status === SosEventStatus.ESCALATED) {
      return this.getIncidentById(id);
    }

    if (existing.status === SosEventStatus.RESOLVED) {
      throw ApiError.badRequest('Cannot escalate a resolved incident');
    }

    const validActorId = await getValidUserActorId(actingAdminId);

    await prisma.$transaction(async (tx) => {
      await adminSosRepository.updateStatusInTx(tx, id, {
        status: SosEventStatus.ESCALATED,
        notes: notes ?? existing.notes ?? undefined,
      });

      await adminSosRepository.addTimelineItemInTx(tx, {
        eventId: id,
        label: 'Escalated for urgent response',
        actorId: validActorId,
      });

      await auditService.record(
        {
          organizationId: existing.organizationId ?? undefined,
          actorId: actingAdminId,
          action: 'admin.sos_escalated',
          entity: 'SosEvent',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: SosEventStatus.ESCALATED,
            notes,
          },
          ipAddress,
        },
        tx,
      );
    });

    realTimeService.broadcastSosAlert({
      id,
      userId: existing.userId,
      status: 'ESCALATED',
    });

    return this.getIncidentById(id);
  },

  async resolveIncident(
    id: string,
    actingAdminId: string,
    notes?: string,
    ipAddress?: string,
  ) {
    const existing = await adminSosRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound('SOS incident not found');
    }

    if (existing.status === SosEventStatus.RESOLVED) {
      return this.getIncidentById(id);
    }

    const resolvedAt = new Date();
    const validActorId = await getValidUserActorId(actingAdminId);

    await prisma.$transaction(async (tx) => {
      await adminSosRepository.updateStatusInTx(tx, id, {
        status: SosEventStatus.RESOLVED,
        resolvedAt,
        resolvedById: validActorId,
        notes: notes ?? existing.notes ?? undefined,
      });

      await adminSosRepository.addTimelineItemInTx(tx, {
        eventId: id,
        label: 'Marked resolved',
        actorId: validActorId,
      });

      await auditService.record(
        {
          organizationId: existing.organizationId ?? undefined,
          actorId: actingAdminId,
          action: 'admin.sos_resolved',
          entity: 'SosEvent',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: SosEventStatus.RESOLVED,
            resolvedAt: resolvedAt.toISOString(),
            notes,
          },
          ipAddress,
        },
        tx,
      );
    });

    realTimeService.broadcastSosAlert({
      id,
      userId: existing.userId,
      status: 'RESOLVED',
    });

    return this.getIncidentById(id);
  },

  async updateStatus(
    id: string,
    actingAdminId: string,
    input: UpdateSosStatusInput,
    ipAddress?: string,
  ) {
    if (input.status === SosEventStatus.ACKNOWLEDGED) {
      return this.acknowledgeIncident(id, actingAdminId, ipAddress);
    }
    if (input.status === SosEventStatus.ESCALATED) {
      return this.escalateIncident(id, actingAdminId, input.notes, ipAddress);
    }
    if (input.status === SosEventStatus.RESOLVED) {
      return this.resolveIncident(id, actingAdminId, input.notes, ipAddress);
    }
    throw ApiError.badRequest(`Cannot manually transition incident back to ${input.status}`);
  },

  async notifyContactAgain(
    eventId: string,
    contactId: string,
    actingAdminId: string,
    ipAddress?: string,
  ) {
    const existing = await adminSosRepository.findById(eventId);
    if (!existing) {
      throw ApiError.notFound('SOS incident not found');
    }

    if (existing.status === SosEventStatus.RESOLVED) {
      throw ApiError.badRequest('Cannot notify contacts for a resolved incident');
    }

    const contact = await adminSosRepository.findContactById(eventId, contactId);
    if (!contact) {
      throw ApiError.notFound('Emergency contact not found for this incident');
    }

    const requestedAt = new Date();
    const validActorId = await getValidUserActorId(actingAdminId);

    await prisma.$transaction(async (tx) => {
      // Truthful representation: record administrative re-notification request without falsely claiming provider delivery
      await adminSosRepository.addTimelineItemInTx(tx, {
        eventId,
        label: `Re-notification requested for ${contact.name} (dispatch pending provider configuration)`,
        actorId: validActorId,
      });

      await auditService.record(
        {
          organizationId: existing.organizationId ?? undefined,
          actorId: actingAdminId,
          action: 'admin.sos_renotification_requested',
          entity: 'SosEventContact',
          entityId: contactId,
          metadata: {
            eventId,
            contactName: contact.name,
            providerStatus: 'UNCONFIGURED_PROVIDER',
            requestedAt: requestedAt.toISOString(),
          },
          ipAddress,
        },
        tx,
      );
    });

    return this.getIncidentById(eventId);
  },
};
