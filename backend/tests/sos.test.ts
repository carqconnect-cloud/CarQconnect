import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { sosRepository } from '../src/modules/sos/sos.repository';
import { auditService } from '../src/modules/audit';
import { SosEventStatus } from '@prisma/client';

describe('Customer SOS Endpoints (/api/v1/sos/*)', () => {
  const app = createApp();

  const user = {
    id: 'user_customer_sos_1',
    email: 'customer@fioner.test',
    isSuperAdmin: false,
    isActive: true,
  };

  const userToken = signAccessToken({
    sub: user.id,
    email: user.email,
    isSuperAdmin: false,
  });

  const mockActiveEvent = {
    id: 'sos_active_123',
    userId: user.id,
    lat: 12.9716,
    lng: 77.5946,
    address: 'Indiranagar, Bengaluru',
    vehicleReg: 'KA05CD5678',
    status: SosEventStatus.PENDING,
    notes: 'Help needed',
    resolvedAt: null,
    resolvedById: null,
    createdAt: new Date('2026-10-12T11:00:00Z'),
    updatedAt: new Date('2026-10-12T11:00:00Z'),
    contactsNotified: [
      {
        id: 'sec_1',
        name: 'Father',
        phone: '+919876543210',
        isNotified: true,
        notifiedAt: new Date('2026-10-12T11:00:00Z'),
        isAcknowledged: false,
        acknowledgedAt: null,
      },
    ],
    timeline: [
      {
        id: 'stl_1',
        label: 'SOS triggered by user',
        actorId: user.id,
        createdAt: new Date('2026-10-12T11:00:00Z'),
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as never);
    vi.spyOn(auditService, 'record').mockResolvedValue({ id: 'audit_log_1' } as never);
  });

  describe('Authorization & Authentication', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/sos/active');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects invalid bearer token with 401 UNAUTHENTICATED', async () => {
      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', 'Bearer invalid_malformed_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('Trigger SOS (POST /api/v1/sos/trigger)', () => {
    it('creates a new SOS incident and records audit event when no active incident exists', async () => {
      vi.spyOn(sosRepository, 'findActiveByUser').mockResolvedValueOnce(null);
      vi.spyOn(sosRepository, 'listUserContacts').mockResolvedValueOnce([
        {
          id: 'contact_1',
          userId: user.id,
          name: 'Father',
          phone: '+919876543210',
          relationship: 'PARENT',
          isPrimary: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const createSpy = vi.spyOn(sosRepository, 'createSosEventInTx').mockResolvedValueOnce(mockActiveEvent as never);
      vi.spyOn(sosRepository, 'findByIdAndUser').mockResolvedValueOnce(mockActiveEvent as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lat: 12.9716,
          lng: 77.5946,
          vehicleReg: 'KA05CD5678',
          notes: 'Flat tyre in remote area',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockActiveEvent.id);
      expect(createSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sos.triggered',
          entity: 'SosEvent',
        }),
        expect.anything(),
      );
    });

    it('returns existing active incident idempotently when one is already active', async () => {
      vi.spyOn(sosRepository, 'findActiveByUser').mockResolvedValueOnce(mockActiveEvent as never);
      const createSpy = vi.spyOn(sosRepository, 'createSosEventInTx');

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lat: 12.9716,
          lng: 77.5946,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockActiveEvent.id);
      expect(res.body.data.alreadyActive).toBe(true);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('handles concurrent trigger conflict gracefully if unique constraint is hit', async () => {
      vi.spyOn(sosRepository, 'findActiveByUser')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockActiveEvent as never);

      vi.spyOn(sosRepository, 'listUserContacts').mockResolvedValueOnce([]);
      const prismaError = new Error('Unique constraint failed on the fields: (`userId`)');
      (prismaError as unknown as { code: string }).code = 'P2002';
      vi.spyOn(sosRepository, 'createSosEventInTx').mockRejectedValueOnce(prismaError);

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lat: 12.9716,
          lng: 77.5946,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockActiveEvent.id);
      expect(res.body.data.alreadyActive).toBe(true);
    });

    it('rejects invalid latitude/longitude with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lat: 95.0, // Invalid: lat must be <= 90
          lng: 77.5946,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Get Active Emergency (GET /api/v1/sos/active)', () => {
    it('returns active emergency if present', async () => {
      vi.spyOn(sosRepository, 'findActiveByUser').mockResolvedValueOnce(mockActiveEvent as never);

      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockActiveEvent.id);
    });

    it('returns null event when no active incident exists', async () => {
      vi.spyOn(sosRepository, 'findActiveByUser').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });

  describe('Cancel SOS (POST /api/v1/sos/:id/cancel)', () => {
    it('allows caller to cancel their own active incident with audit log', async () => {
      vi.spyOn(sosRepository, 'findByIdAndUser').mockResolvedValueOnce(mockActiveEvent as never);
      const cancelSpy = vi.spyOn(sosRepository, 'cancelSosInTx').mockResolvedValueOnce({
        ...mockActiveEvent,
        status: SosEventStatus.RESOLVED,
      } as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      const res = await request(app)
        .post(`/api/v1/sos/${mockActiveEvent.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(cancelSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sos.cancelled_by_user',
          entity: 'SosEvent',
        }),
        expect.anything(),
      );
    });

    it('returns 404 when incident does not belong to user or does not exist', async () => {
      vi.spyOn(sosRepository, 'findByIdAndUser').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/sos/nonexistent_or_other_user_id/cancel')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns existing record idempotently if already RESOLVED', async () => {
      vi.spyOn(sosRepository, 'findByIdAndUser').mockResolvedValueOnce({
        ...mockActiveEvent,
        status: SosEventStatus.RESOLVED,
      } as never);
      const cancelSpy = vi.spyOn(sosRepository, 'cancelSosInTx');

      const res = await request(app)
        .post(`/api/v1/sos/${mockActiveEvent.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('rejects cancellation with 400 if incident is already ESCALATED', async () => {
      vi.spyOn(sosRepository, 'findByIdAndUser').mockResolvedValueOnce({
        ...mockActiveEvent,
        status: SosEventStatus.ESCALATED,
      } as never);

      const res = await request(app)
        .post(`/api/v1/sos/${mockActiveEvent.id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot cancel an escalated SOS emergency');
    });
  });

  describe('Emergency Contacts CRUD (/api/v1/sos/contacts)', () => {
    it('lists user emergency contacts', async () => {
      vi.spyOn(sosRepository, 'listUserContacts').mockResolvedValueOnce([
        {
          id: 'contact_1',
          userId: user.id,
          name: 'Emergency Contact 1',
          phone: '+919876543210',
          relationship: 'FRIEND',
          isPrimary: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/sos/contacts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('creates an emergency contact', async () => {
      vi.spyOn(sosRepository, 'countUserContacts').mockResolvedValueOnce(1);
      vi.spyOn(sosRepository, 'createContact').mockResolvedValueOnce({
        id: 'new_contact_1',
        userId: user.id,
        name: 'Sister',
        phone: '+919876543212',
        relationship: 'SIBLING',
        isPrimary: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/sos/contacts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Sister',
          phone: '+919876543212',
          relationship: 'SIBLING',
          isPrimary: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Sister');
    });

    it('enforces maximum 5 emergency contacts limit with 400', async () => {
      vi.spyOn(sosRepository, 'countUserContacts').mockResolvedValueOnce(5);

      const res = await request(app)
        .post('/api/v1/sos/contacts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Sixth Contact',
          phone: '+919876543219',
          relationship: 'FRIEND',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('deletes user emergency contact', async () => {
      vi.spyOn(sosRepository, 'deleteContact').mockResolvedValueOnce({ count: 1 });

      const res = await request(app)
        .delete('/api/v1/sos/contacts/contact_to_delete')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 404 when contact to delete does not exist for user', async () => {
      vi.spyOn(sosRepository, 'deleteContact').mockResolvedValueOnce({ count: 0 });

      const res = await request(app)
        .delete('/api/v1/sos/contacts/nonexistent_contact')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
