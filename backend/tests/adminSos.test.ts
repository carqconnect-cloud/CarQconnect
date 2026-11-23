import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { adminSosRepository } from '../src/modules/admin/sos/adminSos.repository';
import { auditService } from '../src/modules/audit';
import { SosEventStatus } from '@prisma/client';

describe('Super Admin SOS & Incident Response Endpoints (/api/v1/admin/sos/*)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'user_super_admin_sos_test_1',
    email: 'superadmin_sos@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: 'user_regular_sos_test_1',
    email: 'regular_sos@fioner.test',
    isSuperAdmin: false,
  });

  const mockDbIncident = {
    id: 'sos_evt_test_123',
    userId: 'user_reporter_1',
    organizationId: null,
    vehicleReg: 'KA01AB1234',
    status: SosEventStatus.PENDING,
    lat: 12.9716,
    lng: 77.5946,
    address: 'MG Road, Bengaluru',
    notes: 'Emergency reported',
    resolvedAt: null,
    resolvedById: null,
    createdAt: new Date('2026-10-12T10:00:00Z'),
    updatedAt: new Date('2026-10-12T10:00:00Z'),
    user: {
      id: 'user_reporter_1',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul@example.com',
      phone: '+919876543210',
    },
    organization: null,
    resolvedBy: null,
    contactsNotified: [
      {
        id: 'sec_1',
        name: 'Priya Sharma',
        phone: '+919876543211',
        isNotified: true,
        notifiedAt: new Date('2026-10-12T10:00:01Z'),
        isAcknowledged: false,
        acknowledgedAt: null,
      },
    ],
    timeline: [
      {
        id: 'stl_1',
        label: 'SOS triggered by user',
        createdAt: new Date('2026-10-12T10:00:00Z'),
        actor: {
          id: 'user_reporter_1',
          firstName: 'Rahul',
          lastName: 'Sharma',
          email: 'rahul@example.com',
        },
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
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: superAdminUser.id,
      email: superAdminUser.email,
      isSuperAdmin: true,
      isActive: true,
    } as never);
    vi.spyOn(auditService, 'record').mockResolvedValue({ id: 'audit_log_1' } as never);
    vi.spyOn(adminSosRepository, 'addTimelineItemInTx').mockResolvedValue({} as never);
    vi.spyOn(adminSosRepository, 'updateStatusInTx').mockResolvedValue({} as never);
  });

  describe('Authorization & Security Boundary', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/sos');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-superadmin tokens with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: 'user_regular_sos_test_1',
        email: 'regular_sos@fioner.test',
        isSuperAdmin: false,
        isActive: true,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/sos')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects deactivated superadmin users with 403 FORBIDDEN', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
        id: superAdminUser.id,
        email: superAdminUser.email,
        isSuperAdmin: true,
        isActive: false,
      } as never);

      const res = await request(app)
        .get('/api/v1/admin/sos')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('List SOS Incidents (GET /api/v1/admin/sos)', () => {
    it('returns list of incidents with counts in meta', async () => {
      vi.spyOn(adminSosRepository, 'listIncidents').mockResolvedValueOnce({
        items: [mockDbIncident] as never,
        total: 1,
        counts: {
          total: 1,
          active: 1,
          pending: 1,
          acknowledged: 0,
          escalated: 0,
          resolved: 0,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/sos')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(mockDbIncident.id);
      expect(res.body.data[0].userName).toBe('Rahul Sharma');
      expect(res.body.meta.counts.total).toBe(1);
      expect(res.body.meta.counts.pending).toBe(1);
    });

    it('supports tab, status and search filters', async () => {
      const listSpy = vi.spyOn(adminSosRepository, 'listIncidents').mockResolvedValueOnce({
        items: [],
        total: 0,
        counts: {
          total: 0,
          active: 0,
          pending: 0,
          acknowledged: 0,
          escalated: 0,
          resolved: 0,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/sos?tab=active&status=PENDING&search=KA01')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tab: 'active',
          status: 'PENDING',
          search: 'KA01',
        }),
      );
    });

    it('rejects invalid status filter with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sos?status=UNKNOWN_STATUS')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Get Incident Detail (GET /api/v1/admin/sos/:id)', () => {
    it('returns incident detail with timeline and contacts marked UNCONFIGURED_PROVIDER', async () => {
      vi.spyOn(adminSosRepository, 'findById').mockResolvedValueOnce(mockDbIncident as never);

      const res = await request(app)
        .get(`/api/v1/admin/sos/${mockDbIncident.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(mockDbIncident.id);
      expect(res.body.data.contactsNotified).toHaveLength(1);
      expect(res.body.data.contactsNotified[0].deliveryStatus).toBe('UNCONFIGURED_PROVIDER');
      expect(res.body.data.timeline).toHaveLength(1);
      expect(res.body.data.userEmail).toBe('rahul@example.com');
    });

    it('returns 404 NOT_FOUND when incident does not exist', async () => {
      vi.spyOn(adminSosRepository, 'findById').mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/admin/sos/nonexistent_id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Lifecycle State Transitions', () => {
    describe('Acknowledge Incident (POST /api/v1/admin/sos/:id/acknowledge)', () => {
      it('successfully transitions PENDING incident to ACKNOWLEDGED with audit log', async () => {
        vi.spyOn(adminSosRepository, 'findById')
          .mockResolvedValueOnce(mockDbIncident as never)
          .mockResolvedValueOnce({
            ...mockDbIncident,
            status: SosEventStatus.ACKNOWLEDGED,
          } as never);

        const updateSpy = vi.spyOn(adminSosRepository, 'updateStatusInTx');
        const timelineSpy = vi.spyOn(adminSosRepository, 'addTimelineItemInTx');
        const auditSpy = vi.spyOn(auditService, 'record');

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/acknowledge`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ACKNOWLEDGED');
        expect(updateSpy).toHaveBeenCalledWith(
          expect.anything(),
          mockDbIncident.id,
          { status: SosEventStatus.ACKNOWLEDGED },
        );
        expect(timelineSpy).toHaveBeenCalled();
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'admin.sos_acknowledged',
            entity: 'SosEvent',
            entityId: mockDbIncident.id,
          }),
          expect.anything(),
        );
      });

      it('is idempotent if incident is already ACKNOWLEDGED', async () => {
        const alreadyAcked = {
          ...mockDbIncident,
          status: SosEventStatus.ACKNOWLEDGED,
        };
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(alreadyAcked as never);
        const updateSpy = vi.spyOn(adminSosRepository, 'updateStatusInTx');

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/acknowledge`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ACKNOWLEDGED');
        expect(updateSpy).not.toHaveBeenCalled();
      });

      it('rejects acknowledge if incident is already RESOLVED with 400', async () => {
        const resolved = {
          ...mockDbIncident,
          status: SosEventStatus.RESOLVED,
        };
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(resolved as never);

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/acknowledge`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('rejects acknowledge if incident is already ESCALATED with 400', async () => {
        const escalated = {
          ...mockDbIncident,
          status: SosEventStatus.ESCALATED,
        };
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(escalated as never);

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/acknowledge`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Escalate Incident (POST /api/v1/admin/sos/:id/escalate)', () => {
      it('successfully escalates an active incident with audit log', async () => {
        vi.spyOn(adminSosRepository, 'findById')
          .mockResolvedValueOnce(mockDbIncident as never)
          .mockResolvedValueOnce({
            ...mockDbIncident,
            status: SosEventStatus.ESCALATED,
          } as never);

        const updateSpy = vi.spyOn(adminSosRepository, 'updateStatusInTx');
        const auditSpy = vi.spyOn(auditService, 'record');

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/escalate`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ notes: 'Escalating for emergency assistance' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ESCALATED');
        expect(updateSpy).toHaveBeenCalledWith(
          expect.anything(),
          mockDbIncident.id,
          expect.objectContaining({ status: SosEventStatus.ESCALATED }),
        );
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'admin.sos_escalated',
            entity: 'SosEvent',
          }),
          expect.anything(),
        );
      });

      it('rejects escalate on already RESOLVED incident with 400', async () => {
        const resolved = {
          ...mockDbIncident,
          status: SosEventStatus.RESOLVED,
        };
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(resolved as never);

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/escalate`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ notes: 'Attempting escalation' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('Resolve Incident (POST /api/v1/admin/sos/:id/resolve)', () => {
      it('successfully resolves an incident with audit log', async () => {
        vi.spyOn(adminSosRepository, 'findById')
          .mockResolvedValueOnce(mockDbIncident as never)
          .mockResolvedValueOnce({
            ...mockDbIncident,
            status: SosEventStatus.RESOLVED,
            resolvedAt: new Date('2026-10-12T10:30:00Z'),
          } as never);

        const updateSpy = vi.spyOn(adminSosRepository, 'updateStatusInTx');
        const auditSpy = vi.spyOn(auditService, 'record');

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/resolve`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ notes: 'Assistance provided, situation resolved' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('RESOLVED');
        expect(updateSpy).toHaveBeenCalledWith(
          expect.anything(),
          mockDbIncident.id,
          expect.objectContaining({ status: SosEventStatus.RESOLVED }),
        );
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'admin.sos_resolved',
            entity: 'SosEvent',
          }),
          expect.anything(),
        );
      });

      it('is idempotent if incident is already RESOLVED', async () => {
        const resolved = {
          ...mockDbIncident,
          status: SosEventStatus.RESOLVED,
          resolvedAt: new Date('2026-10-12T10:30:00Z'),
        };
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(resolved as never);
        const updateSpy = vi.spyOn(adminSosRepository, 'updateStatusInTx');

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/resolve`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ notes: 'Already resolved' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('RESOLVED');
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    describe('Re-notify Contact (POST /api/v1/admin/sos/:id/contacts/:contactId/notify-again)', () => {
      it('records re-notification request and audit log without falsifying provider dispatch', async () => {
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(mockDbIncident as never);

        vi.spyOn(adminSosRepository, 'findContactById').mockResolvedValueOnce({
          id: 'sec_1',
          name: 'Priya Sharma',
          phone: '+919876543211',
          eventId: mockDbIncident.id,
        } as never);

        const timelineSpy = vi.spyOn(adminSosRepository, 'addTimelineItemInTx');
        const auditSpy = vi.spyOn(auditService, 'record');

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/contacts/sec_1/notify-again`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.contactsNotified[0].deliveryStatus).toBe('UNCONFIGURED_PROVIDER');
        expect(timelineSpy).toHaveBeenCalled();
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'admin.sos_renotification_requested',
            entity: 'SosEventContact',
            entityId: 'sec_1',
            metadata: expect.objectContaining({
              providerStatus: 'UNCONFIGURED_PROVIDER',
            }),
          }),
          expect.anything(),
        );
      });

      it('returns 404 when contact is not found for this incident', async () => {
        vi.spyOn(adminSosRepository, 'findById').mockResolvedValue(mockDbIncident as never);
        vi.spyOn(adminSosRepository, 'findContactById').mockResolvedValueOnce(null);

        const res = await request(app)
          .post(`/api/v1/admin/sos/${mockDbIncident.id}/contacts/nonexistent_contact/notify-again`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      });
    });
  });
});
