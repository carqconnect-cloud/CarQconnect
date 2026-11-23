import { Prisma, SosEventStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import type { CreateSosContactInput, TriggerSosInput } from './sos.schema';

export const sosRepository = {
  async findActiveByUser(userId: string) {
    return prisma.sosEvent.findFirst({
      where: {
        userId,
        status: {
          in: [SosEventStatus.PENDING, SosEventStatus.ACKNOWLEDGED, SosEventStatus.ESCALATED],
        },
      },
      include: {
        contactsNotified: true,
        timeline: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  async findByIdAndUser(id: string, userId: string) {
    return prisma.sosEvent.findFirst({
      where: { id, userId },
      include: {
        contactsNotified: true,
        timeline: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  async listUserContacts(userId: string) {
    return prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  },

  async countUserContacts(userId: string) {
    return prisma.emergencyContact.count({ where: { userId } });
  },

  async createContact(userId: string, input: CreateSosContactInput) {
    const initials = input.name
      ? input.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
      : 'EM';
    return prisma.emergencyContact.create({
      data: {
        userId,
        name: input.name,
        phone: input.phone,
        initials,
        relationship: input.relationship,
        isPrimary: input.isPrimary,
      },
    });
  },

  async deleteContact(id: string, userId: string) {
    return prisma.emergencyContact.deleteMany({
      where: { id, userId },
    });
  },

  async createSosEventInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    input: TriggerSosInput,
    userContacts: Array<{ id: string; name: string; phone: string }>,
  ) {
    // Derive organization association strictly from trusted server-side membership
    const defaultMembership = await tx.membership.findFirst({
      where: { userId, status: 'ACTIVE', isDefault: true },
      select: { organizationId: true },
    });
    const organizationId = defaultMembership?.organizationId ?? null;

    const event = await tx.sosEvent.create({
      data: {
        userId,
        organizationId,
        lat: input.lat,
        lng: input.lng,
        vehicleReg: input.vehicleReg,
        address: input.address,
        notes: input.notes,
        status: SosEventStatus.PENDING,
      },
    });

    // Create initial timeline items
    await tx.sosTimelineItem.create({
      data: {
        eventId: event.id,
        label: 'SOS triggered by user',
        actorId: userId,
      },
    });

    await tx.sosTimelineItem.create({
      data: {
        eventId: event.id,
        label: `Location captured: ${input.lat}, ${input.lng}`,
        actorId: userId,
      },
    });

    if (userContacts.length > 0) {
      await tx.sosEventContact.createMany({
        data: userContacts.map((c) => ({
          eventId: event.id,
          contactId: c.id,
          name: c.name,
          phone: c.phone,
          isNotified: false,
          notifiedAt: null,
          isAcknowledged: false,
        })),
      });

      await tx.sosTimelineItem.create({
        data: {
          eventId: event.id,
          label: `Emergency contacts snapshot recorded (${userContacts.length} contacts; dispatch pending provider configuration)`,
          actorId: userId,
        },
      });
    } else {
      await tx.sosTimelineItem.create({
        data: {
          eventId: event.id,
          label: 'No emergency contacts configured for user',
          actorId: userId,
        },
      });
    }

    return event;
  },

  async cancelSosInTx(tx: Prisma.TransactionClient, id: string, userId: string) {
    const updated = await tx.sosEvent.update({
      where: { id },
      data: {
        status: SosEventStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });

    await tx.sosTimelineItem.create({
      data: {
        eventId: id,
        label: 'Cancelled by user',
        actorId: userId,
      },
    });

    return updated;
  },
};
