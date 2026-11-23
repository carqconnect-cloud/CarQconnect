import { SosEventStatus } from '@prisma/client';
import { ApiError } from '../../common/utils/apiError';
import { prisma } from '../../config/database';
import { auditService } from '../audit';
import { sosRepository } from './sos.repository';
import { realTimeService } from '../../common/services/socket.service';
import type { CreateSosContactInput, TriggerSosInput } from './sos.schema';

const MAX_CONTACTS_PER_USER = 5;

export const sosService = {
  async triggerSos(userId: string, input: TriggerSosInput, ipAddress?: string) {
    const existingActive = await sosRepository.findActiveByUser(userId);
    if (existingActive) {
      // Idempotently return the existing active incident
      return {
        ...existingActive,
        alreadyActive: true,
      };
    }

    const contacts = await sosRepository.listUserContacts(userId);

    try {
      const event = await prisma.$transaction(async (tx) => {
        // Atomic check inside transaction against race conditions
        const activeInsideTx = await tx.sosEvent.findFirst({
          where: {
            userId,
            status: { in: [SosEventStatus.PENDING, SosEventStatus.ACKNOWLEDGED, SosEventStatus.ESCALATED] },
          },
        });
        if (activeInsideTx) {
          return { ...activeInsideTx, alreadyActive: true };
        }

        const created = await sosRepository.createSosEventInTx(tx, userId, input, contacts);

        await auditService.record(
          {
            actorId: userId,
            action: 'sos.triggered',
            entity: 'SosEvent',
            entityId: created.id,
            metadata: {
              lat: input.lat,
              lng: input.lng,
              vehicleReg: input.vehicleReg,
              contactsCount: contacts.length,
            },
            ipAddress,
          },
          tx,
        );

        return { ...created, alreadyActive: false };
      });

      const populated = await sosRepository.findByIdAndUser(event.id, userId);

      if (populated) {
        realTimeService.broadcastSosAlert({
          id: populated.id,
          userId: populated.userId,
          status: String(populated.status),
          lat: populated.lat ?? undefined,
          lng: populated.lng ?? undefined,
          vehicleReg: populated.vehicleReg ?? undefined,
        });
      }

      return {
        ...populated,
        alreadyActive: event.alreadyActive,
      };
    } catch (err: unknown) {
      // If a concurrent trigger won the race and committed, handle the unique constraint conflict gracefully
      if (
        (err as { code?: string })?.code === 'P2002' ||
        String(err).includes('sos_events_user_active_unique')
      ) {
        const active = await sosRepository.findActiveByUser(userId);
        if (active) {
          return {
            ...active,
            alreadyActive: true,
          };
        }
      }
      throw err;
    }
  },

  async getActiveSos(userId: string) {
    return sosRepository.findActiveByUser(userId);
  },

  async cancelSos(id: string, userId: string, ipAddress?: string) {
    const existing = await sosRepository.findByIdAndUser(id, userId);
    if (!existing) {
      throw ApiError.notFound('Active SOS incident not found');
    }

    if (existing.status === SosEventStatus.RESOLVED) {
      return existing;
    }

    if (existing.status === SosEventStatus.ESCALATED) {
      throw ApiError.badRequest('Cannot cancel an escalated SOS emergency. Please contact emergency responders.');
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await sosRepository.cancelSosInTx(tx, id, userId);

      await auditService.record(
        {
          actorId: userId,
          action: 'sos.cancelled_by_user',
          entity: 'SosEvent',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: SosEventStatus.RESOLVED,
          },
          ipAddress,
        },
        tx,
      );

      return updated;
    });

    return cancelled;
  },

  async listContacts(userId: string) {
    return sosRepository.listUserContacts(userId);
  },

  async createContact(userId: string, input: CreateSosContactInput) {
    const count = await sosRepository.countUserContacts(userId);
    if (count >= MAX_CONTACTS_PER_USER) {
      throw ApiError.badRequest(`Maximum of ${MAX_CONTACTS_PER_USER} emergency contacts reached`);
    }

    return sosRepository.createContact(userId, input);
  },

  async deleteContact(id: string, userId: string) {
    const result = await sosRepository.deleteContact(id, userId);
    if (result.count === 0) {
      throw ApiError.notFound('Emergency contact not found');
    }
    return { success: true };
  },
};
