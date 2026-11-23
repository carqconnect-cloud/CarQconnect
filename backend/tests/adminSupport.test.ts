import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';
import { auditService } from '../src/modules/audit/audit.service';
import { adminSupportService } from '../src/modules/admin/support/adminSupport.service';
import { listTicketsQuerySchema } from '../src/modules/admin/support/adminSupport.schema';

describe('Admin Support Desk Module (Phase 2)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'admin_sup_test_1',
    email: 'superadmin_sup@fioner.test',
    firstName: 'Super',
    lastName: 'Admin',
    isSuperAdmin: true,
    isActive: true,
  };

  const nonSuperAdminUser = {
    id: 'user_regular_1',
    email: 'regular_user@fioner.test',
    firstName: 'Regular',
    lastName: 'User',
    isSuperAdmin: false,
    isActive: true,
  };

  const inactiveAdminUser = {
    id: 'admin_inactive_1',
    email: 'inactive_admin@fioner.test',
    firstName: 'Inactive',
    lastName: 'Admin',
    isSuperAdmin: true,
    isActive: false,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: nonSuperAdminUser.id,
    email: nonSuperAdminUser.email,
    isSuperAdmin: false,
  });

  const mockTicket = {
    id: 'tkt_test_100',
    organizationId: 'org_test_1',
    customerId: 'cust_test_1',
    userId: 'user_consumer_1',
    vehicleId: 'veh_test_1',
    subject: 'GPS unit not updating location',
    description: 'Vehicle tracker has not sent ping in 24 hours',
    category: 'Hardware',
    priority: 'HIGH',
    status: 'OPEN',
    assignedToId: null,
    aiEscalated: false,
    aiSummary: null,
    resolvedAt: null,
    createdAt: new Date('2026-10-19T08:00:00Z'),
    updatedAt: new Date('2026-10-19T08:00:00Z'),
    user: {
      id: 'user_consumer_1',
      email: 'consumer@fioner.test',
      firstName: 'Rahul',
      lastName: 'Mehta',
      phone: '+919988776655',
    },
    vehicle: {
      id: 'veh_test_1',
      reg: 'KA01AB1234',
      model: 'Hyundai Creta',
      fuel: 'PETROL',
    },
    customer: {
      id: 'cust_test_1',
      name: 'Acme Fleet Services',
      email: 'contact@acmefleet.test',
      phone: '+919876543210',
      company: 'Acme Corp',
    },
    organization: {
      id: 'org_test_1',
      name: 'Acme Enterprises',
      slug: 'acme-enterprises',
    },
    assignedTo: null,
    messages: [
      {
        id: 'msg_1',
        ticketId: 'tkt_test_100',
        senderType: 'CUSTOMER',
        senderId: 'user_consumer_1',
        message: 'The device light is blinking red.',
        createdAt: new Date('2026-10-19T08:05:00Z'),
      },
      {
        id: 'msg_2',
        ticketId: 'tkt_test_100',
        senderType: 'ADMIN',
        senderId: superAdminUser.id,
        message: 'We are investigating signal strength in your sector.',
        createdAt: new Date('2026-10-19T08:30:00Z'),
      },
    ],
    _count: {
      messages: 2,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(auditService, 'record').mockResolvedValue({} as never);

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return cb as never;
    });

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(
      (async (args: unknown) => {
        const query = args as { where: { id?: string; email?: string } };
        const id = query?.where?.id;
        if (id === superAdminUser.id) return superAdminUser as never;
        if (id === nonSuperAdminUser.id) return nonSuperAdminUser as never;
        if (id === inactiveAdminUser.id) return inactiveAdminUser as never;
        return superAdminUser as never;
      }) as unknown as typeof prisma.user.findUnique,
    );
  });

  describe('Security & Authorization Gate', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/admin/support/tickets');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-Super-Admin requests with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/support/tickets')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('permits authenticated Super Admin callers', async () => {
      vi.spyOn(prisma.supportTicket, 'findMany').mockResolvedValue([mockTicket as never]);
      vi.spyOn(prisma.supportTicket, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/support/tickets')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Ticket List & Triage', () => {
    it('rejects invalid pagination parameters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/support/tickets?page=0&limit=500')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects unsupported ticket status query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/support/tickets?status=CLOSED')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('filters tickets by valid status, category, and unassigned state', async () => {
      const findSpy = vi.spyOn(prisma.supportTicket, 'findMany').mockResolvedValue([mockTicket as never]);
      vi.spyOn(prisma.supportTicket, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/support/tickets?status=OPEN&category=Hardware&unassigned=true')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
            category: { equals: 'Hardware', mode: 'insensitive' },
            assignedToId: null,
          }),
        }),
      );
    });

    it('correctly parses aiEscalated and unassigned query parameters (omitted, boolean-like, invalid)', () => {
      // 1. Omitted values must remain undefined (not false)
      const omitted = listTicketsQuerySchema.parse({});
      expect(omitted.aiEscalated).toBeUndefined();
      expect(omitted.unassigned).toBeUndefined();

      // 2. Truthy representations ('true', '1') parse to true
      const truthy = listTicketsQuerySchema.parse({ aiEscalated: 'true', unassigned: '1' });
      expect(truthy.aiEscalated).toBe(true);
      expect(truthy.unassigned).toBe(true);

      // 3. Falsy representations ('false', '0') parse to false
      const falsy = listTicketsQuerySchema.parse({ aiEscalated: 'false', unassigned: '0' });
      expect(falsy.aiEscalated).toBe(false);
      expect(falsy.unassigned).toBe(false);

      // 4. Invalid values are rejected
      expect(() => listTicketsQuerySchema.parse({ aiEscalated: 'invalid' })).toThrow();
      expect(() => listTicketsQuerySchema.parse({ unassigned: 'yes' })).toThrow();
    });
  });

  describe('Ticket Detail & Timeline', () => {
    it('returns ticket details with timeline messages in chronological order', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue(mockTicket as never);

      const res = await request(app)
        .get(`/api/v1/admin/support/tickets/${mockTicket.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(mockTicket.id);
      expect(res.body.data.messages).toHaveLength(2);
      expect(res.body.data.messages[0].id).toBe('msg_1');
      expect(res.body.data.messages[1].id).toBe('msg_2');
    });

    it('returns 404 if ticket does not exist', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/admin/support/tickets/tkt_nonexistent')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('appends an administrative message to the timeline with ADMIN senderType', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue(mockTicket as never);
      const createMsgSpy = vi.spyOn(prisma.ticketMessage, 'create').mockResolvedValue({
        id: 'msg_3',
        ticketId: mockTicket.id,
        senderType: 'ADMIN',
        senderId: superAdminUser.id,
        message: 'Replacement unit dispatched.',
        createdAt: new Date(),
      } as never);

      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${mockTicket.id}/messages`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ message: 'Replacement unit dispatched.' });

      expect(res.status).toBe(201);
      expect(createMsgSpy).toHaveBeenCalledWith({
        data: {
          ticketId: mockTicket.id,
          message: 'Replacement unit dispatched.',
          senderType: 'ADMIN',
          senderId: superAdminUser.id,
        },
      });
    });

    it('rejects empty message body with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${mockTicket.id}/messages`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ message: '   ' });

      expect(res.status).toBe(400);
    });
  });

  describe('Ticket Status Lifecycle', () => {
    it('rejects unsupported status values with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/support/tickets/${mockTicket.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ARCHIVED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('transitions status from OPEN to IN_PROGRESS and records audit log', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'OPEN',
      } as never);

      const updateSpy = vi.spyOn(prisma.supportTicket, 'update').mockResolvedValue({
        ...mockTicket,
        status: 'IN_PROGRESS',
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/support/tickets/${mockTicket.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'support_ticket.status_updated',
          metadata: expect.objectContaining({
            previousStatus: 'OPEN',
            newStatus: 'IN_PROGRESS',
            reopened: false,
          }),
        }),
        expect.anything(),
      );
    });

    it('sets resolvedAt timestamp when transitioning to RESOLVED', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'IN_PROGRESS',
        resolvedAt: null,
      } as never);

      const updateSpy = vi.spyOn(prisma.supportTicket, 'update').mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
        resolvedAt: new Date(),
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/support/tickets/${mockTicket.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'RESOLVED' });

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('clears resolvedAt when reopening a RESOLVED ticket to ESCALATED', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
        resolvedAt: new Date('2026-10-19T09:00:00Z'),
      } as never);

      const updateSpy = vi.spyOn(prisma.supportTicket, 'update').mockResolvedValue({
        ...mockTicket,
        status: 'ESCALATED',
        resolvedAt: null,
      } as never);

      const res = await request(app)
        .patch(`/api/v1/admin/support/tickets/${mockTicket.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'ESCALATED' });

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ESCALATED',
            resolvedAt: null,
          }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            previousStatus: 'RESOLVED',
            newStatus: 'ESCALATED',
            reopened: true,
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('Assignment & Unassignment', () => {
    it('rejects assignment to an inactive user', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue(mockTicket as never);

      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${mockTicket.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ assignedToId: inactiveAdminUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/inactive/);
    });

    it('rejects assignment to a user who is not a Super Admin', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue(mockTicket as never);

      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${mockTicket.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ assignedToId: nonSuperAdminUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Only platform Super Admins may be assigned/);
    });

    it('successfully assigns ticket to an active Super Admin', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue(mockTicket as never);
      const updateSpy = vi.spyOn(prisma.supportTicket, 'update').mockResolvedValue({
        ...mockTicket,
        assignedToId: superAdminUser.id,
      } as never);

      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${mockTicket.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ assignedToId: superAdminUser.id });

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { assignedToId: superAdminUser.id },
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'support_ticket.assigned',
          metadata: expect.objectContaining({
            newAssignedToId: superAdminUser.id,
            unassigned: false,
          }),
        }),
        expect.anything(),
      );
    });

    it('successfully unassigns ticket when assignedToId is null', async () => {
      vi.spyOn(prisma.supportTicket, 'findUnique').mockResolvedValue({
        ...mockTicket,
        assignedToId: superAdminUser.id,
      } as never);
      const updateSpy = vi.spyOn(prisma.supportTicket, 'update').mockResolvedValue({
        ...mockTicket,
        assignedToId: null,
      } as never);

      const res = await request(app)
        .post(`/api/v1/admin/support/tickets/${mockTicket.id}/assign`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ assignedToId: null });

      expect(res.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { assignedToId: null },
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'support_ticket.assigned',
          metadata: expect.objectContaining({
            newAssignedToId: null,
            unassigned: true,
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('Identity & Ownership Invariants Service Boundary', () => {
    it('rejects customerId supplied without organizationId', async () => {
      await expect(
        adminSupportService.validateIdentityInvariants({
          customerId: 'cust_123',
          organizationId: null,
        }),
      ).rejects.toThrow('customerId requires an organizationId');
    });

    it('rejects customer belonging to a different organization', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: 'cust_123',
        organizationId: 'org_A',
      } as never);

      await expect(
        adminSupportService.validateIdentityInvariants({
          customerId: 'cust_123',
          organizationId: 'org_B',
        }),
      ).rejects.toThrow('Customer does not belong to the specified organization');
    });

    it('rejects vehicleId supplied without userId', async () => {
      await expect(
        adminSupportService.validateIdentityInvariants({
          vehicleId: 'veh_123',
          userId: null,
        }),
      ).rejects.toThrow('vehicleId requires a platform userId');
    });

    it('rejects a CRM ticket with null userId containing a vehicleId', async () => {
      await expect(
        adminSupportService.validateIdentityInvariants({
          organizationId: 'org_crm_1',
          customerId: null,
          userId: null,
          vehicleId: 'veh_some_car',
        }),
      ).rejects.toThrow('vehicleId requires a platform userId');
    });

    it('rejects vehicle belonging to a different user', async () => {
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValue({
        id: 'veh_123',
        userId: 'user_X',
      } as never);

      await expect(
        adminSupportService.validateIdentityInvariants({
          vehicleId: 'veh_123',
          userId: 'user_Y',
        }),
      ).rejects.toThrow('Vehicle does not belong to the specified user');
    });

    it('accepts global consumer ticket with null organizationId and valid user/vehicle pair', async () => {
      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValue({
        id: 'veh_123',
        userId: 'user_123',
      } as never);

      await expect(
        adminSupportService.validateIdentityInvariants({
          organizationId: null,
          customerId: null,
          userId: 'user_123',
          vehicleId: 'veh_123',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('AI Escalation Queue', () => {
    it('returns filtered AI-escalated tickets', async () => {
      const findSpy = vi.spyOn(prisma.supportTicket, 'findMany').mockResolvedValue([
        {
          ...mockTicket,
          aiEscalated: true,
          aiSummary: 'Customer requested human agent for GPS battery replacement',
        } as never,
      ]);
      vi.spyOn(prisma.supportTicket, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/admin/support/ai-escalations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            aiEscalated: true,
          }),
        }),
      );
      expect(res.body.data[0].aiEscalated).toBe(true);
    });
  });

  describe('Support Analytics & Truthful Metric Boundaries', () => {
    it('computes real database counts and preserves SLA / AI containment as null/unavailable', async () => {
      vi.spyOn(prisma.supportTicket, 'count')
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(15) // open
        .mockResolvedValueOnce(10) // in_progress
        .mockResolvedValueOnce(5)  // escalated
        .mockResolvedValueOnce(20) // resolved
        .mockResolvedValueOnce(8)  // aiEscalated
        .mockResolvedValueOnce(7); // unassigned

      vi.spyOn(prisma.supportTicket, 'groupBy')
        .mockResolvedValueOnce([
          { category: 'Hardware', _count: { _all: 30 } },
          { category: 'Billing', _count: { _all: 20 } },
        ] as never)
        .mockResolvedValueOnce([
          { priority: 'HIGH', _count: { _all: 25 } },
          { priority: 'MEDIUM', _count: { _all: 25 } },
        ] as never);

      const res = await request(app)
        .get('/api/v1/admin/support/analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.totalTickets).toBe(50);
      expect(data.openTickets).toBe(15);
      expect(data.inProgressTickets).toBe(10);
      expect(data.escalatedTickets).toBe(5);
      expect(data.resolvedTickets).toBe(20);
      expect(data.aiEscalatedCount).toBe(8);
      expect(data.unassignedCount).toBe(7);
      expect(data.byCategory.Hardware).toBe(30);
      expect(data.byPriority.HIGH).toBe(25);

      // SLA & AI containment: strictly null and truthful
      expect(data.firstResponse.percentage).toBeNull();
      expect(data.firstResponse.status).toBe('UNCONFIGURED');
      expect(data.aiContainment.percentage).toBeNull();
      expect(data.aiContainment.status).toBe('UNAVAILABLE');
    });
  });
});
