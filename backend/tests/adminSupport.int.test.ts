import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';

describe('Fioner Support Desk — Real PostgreSQL Integration Suite (fioner_test)', () => {
  const app = createApp();

  // Test tracking arrays for deterministic, reverse-dependency cleanup
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdTicketIds: string[] = [];

  const uniqueSuffix = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Test actor IDs and tokens
  let activeSuperAdminId: string;
  let activeSuperAdminEmail: string;
  let activeSuperAdminToken: string;

  let secondarySuperAdminId: string;
  let secondarySuperAdminEmail: string;

  let regularUserId: string;
  let regularUserEmail: string;
  let regularUserToken: string;

  let inactiveSuperAdminId: string;
  let inactiveSuperAdminEmail: string;
  let inactiveSuperAdminToken: string;

  let testOrgId: string;
  let testCustomerId: string;

  // Key fixture ticket IDs for test cases
  let ticketOpenId: string;
  let ticketEscalatedId: string;
  let ticketResolvedId: string;
  let ticketForLifecycleId: string;

  beforeAll(async () => {
    // 1. Mandatory Safety Gate Verification
    const dbIdentity = await prisma.$queryRaw<Array<{ current_database: string; inet_server_port: number }>>`
      SELECT current_database(), inet_server_port();
    `;
    const activeDb = dbIdentity[0]?.current_database;
    if (activeDb !== 'fioner_test') {
      throw new Error(`SAFETY ABORT: Test target database is '${activeDb}', expected 'fioner_test'.`);
    }

    // 2. Create Active Super Admin actor
    activeSuperAdminEmail = `superadmin_${uniqueSuffix}@fioner.test`;
    const superAdmin = await prisma.user.create({
      data: {
        email: activeSuperAdminEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'Support',
        lastName: 'SuperAdmin',
        isActive: true,
        isSuperAdmin: true,
      },
    });
    activeSuperAdminId = superAdmin.id;
    createdUserIds.push(superAdmin.id);
    activeSuperAdminToken = signAccessToken({
      sub: superAdmin.id,
      email: superAdmin.email,
      isSuperAdmin: true,
    });

    // 3. Create Secondary Active Super Admin for assignment verification
    secondarySuperAdminEmail = `assignee_admin_${uniqueSuffix}@fioner.test`;
    const secondaryAdmin = await prisma.user.create({
      data: {
        email: secondarySuperAdminEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'Staff',
        lastName: 'Admin',
        isActive: true,
        isSuperAdmin: true,
      },
    });
    secondarySuperAdminId = secondaryAdmin.id;
    createdUserIds.push(secondaryAdmin.id);

    // 4. Create Regular Non-Admin user
    regularUserEmail = `regular_${uniqueSuffix}@fioner.test`;
    const regularUser = await prisma.user.create({
      data: {
        email: regularUserEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        isSuperAdmin: false,
      },
    });
    regularUserId = regularUser.id;
    createdUserIds.push(regularUser.id);
    regularUserToken = signAccessToken({
      sub: regularUser.id,
      email: regularUser.email,
      isSuperAdmin: false,
    });

    // 5. Create Deactivated Super Admin user
    inactiveSuperAdminEmail = `inactive_admin_${uniqueSuffix}@fioner.test`;
    const inactiveAdmin = await prisma.user.create({
      data: {
        email: inactiveSuperAdminEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'Inactive',
        lastName: 'Admin',
        isActive: false,
        isSuperAdmin: true,
      },
    });
    inactiveSuperAdminId = inactiveAdmin.id;
    createdUserIds.push(inactiveAdmin.id);
    inactiveSuperAdminToken = signAccessToken({
      sub: inactiveAdmin.id,
      email: inactiveAdmin.email,
      isSuperAdmin: true,
    });

    // 6. Create Organization & Customer fixtures
    const org = await prisma.organization.create({
      data: {
        name: `Support Test Org ${uniqueSuffix}`,
        slug: `support-org-${uniqueSuffix}`,
      },
    });
    testOrgId = org.id;
    createdOrgIds.push(org.id);

    const customer = await prisma.customer.create({
      data: {
        organizationId: org.id,
        name: `Customer Alpha ${uniqueSuffix}`,
        email: `cust_${uniqueSuffix}@example.com`,
        phone: '+919876543210',
        company: `Company ${uniqueSuffix}`,
      },
    });
    testCustomerId = customer.id;
    createdCustomerIds.push(customer.id);

    // 7. Create Support Ticket fixtures
    // Ticket 1: OPEN, Billing, Unassigned
    const tkt1 = await prisma.supportTicket.create({
      data: {
        subject: `Billing dispute for account ${uniqueSuffix}`,
        description: `Customer reported billing discrepancy in invoice ${uniqueSuffix}`,
        category: 'Billing',
        priority: 'HIGH',
        status: 'OPEN',
        organizationId: testOrgId,
        customerId: testCustomerId,
        userId: regularUserId,
        assignedToId: null,
        aiEscalated: false,
      },
    });
    ticketOpenId = tkt1.id;
    createdTicketIds.push(tkt1.id);

    // Add initial messages to Ticket 1
    await prisma.ticketMessage.createMany({
      data: [
        {
          ticketId: tkt1.id,
          senderType: 'CUSTOMER',
          senderId: regularUserId,
          message: 'Initial customer inquiry: I was double charged.',
          createdAt: new Date('2026-10-19T08:00:00Z'),
        },
        {
          ticketId: tkt1.id,
          senderType: 'ADMIN',
          senderId: activeSuperAdminId,
          message: 'Agent response: We are verifying transaction history.',
          createdAt: new Date('2026-10-19T08:15:00Z'),
        },
      ],
    });

    // Ticket 2: ESCALATED, Technical, AI Escalated
    const tkt2 = await prisma.supportTicket.create({
      data: {
        subject: `Urgent Hardware offline ${uniqueSuffix}`,
        description: `GPS tracking offline after firmware flash ${uniqueSuffix}`,
        category: 'Technical',
        priority: 'URGENT',
        status: 'ESCALATED',
        organizationId: testOrgId,
        customerId: testCustomerId,
        assignedToId: activeSuperAdminId,
        aiEscalated: true,
        aiSummary: `AI flagged sentiment as critical during session ${uniqueSuffix}`,
      },
    });
    ticketEscalatedId = tkt2.id;
    createdTicketIds.push(tkt2.id);

    // Ticket 3: RESOLVED
    const tkt3 = await prisma.supportTicket.create({
      data: {
        subject: `General inquiry on plan renewals ${uniqueSuffix}`,
        description: `Questions regarding annual discount tier ${uniqueSuffix}`,
        category: 'General',
        priority: 'LOW',
        status: 'RESOLVED',
        resolvedAt: new Date(),
        organizationId: testOrgId,
        assignedToId: activeSuperAdminId,
        aiEscalated: false,
      },
    });
    ticketResolvedId = tkt3.id;
    createdTicketIds.push(tkt3.id);

    // Ticket 4: Dedicated for lifecycle transitions (Status and Assignment)
    const tkt4 = await prisma.supportTicket.create({
      data: {
        subject: `Lifecycle state machine ticket ${uniqueSuffix}`,
        description: `Exercising transitions for ${uniqueSuffix}`,
        category: 'General',
        priority: 'MEDIUM',
        status: 'OPEN',
        organizationId: testOrgId,
        assignedToId: null,
      },
    });
    ticketForLifecycleId = tkt4.id;
    createdTicketIds.push(tkt4.id);
    console.log('Created tickets in beforeAll:', {
      tkt1: tkt1.id,
      tkt2: tkt2.id,
      tkt3: tkt3.id,
      tkt4: tkt4.id,
    });
  });

  afterAll(async () => {
    // Clean up created fixtures in strict reverse-dependency order
    try {
      if (createdTicketIds.length > 0) {
        await prisma.auditLog.deleteMany({
          where: {
            entity: 'SupportTicket',
            entityId: { in: createdTicketIds },
          },
        });
        await prisma.ticketMessage.deleteMany({
          where: { ticketId: { in: createdTicketIds } },
        });
        await prisma.supportTicket.deleteMany({
          where: { id: { in: createdTicketIds } },
        });
      }
      if (createdCustomerIds.length > 0) {
        await prisma.customer.deleteMany({
          where: { id: { in: createdCustomerIds } },
        });
      }
      if (createdOrgIds.length > 0) {
        await prisma.organization.deleteMany({
          where: { id: { in: createdOrgIds } },
        });
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }
    } catch (cleanupErr) {
      console.error('Test cleanup warning:', cleanupErr);
    }
  });

  // ---------------------------------------------------------------------------
  // Case 1: Unauthenticated request returns 401
  // ---------------------------------------------------------------------------
  it('INT-SUP-01: Unauthenticated request returns 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/admin/support/tickets');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(res.body.error.message).toMatch(/Missing bearer token/i);
  });

  // ---------------------------------------------------------------------------
  // Case 2: Authenticated non-Super-Admin receives 403
  // ---------------------------------------------------------------------------
  it('INT-SUP-02: Authenticated non-Super-Admin receives 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/support/tickets')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/Super admin access required/i);
  });

  // ---------------------------------------------------------------------------
  // Case 3: Inactive Super Admin receives 403
  // ---------------------------------------------------------------------------
  it('INT-SUP-03: Inactive Super Admin receives 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/support/tickets')
      .set('Authorization', `Bearer ${inactiveSuperAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toMatch(/Super admin access required/i);
  });

  // ---------------------------------------------------------------------------
  // Case 4: Active Super Admin can list tickets
  // ---------------------------------------------------------------------------
  it('INT-SUP-04: Active Super Admin lists tickets with pagination envelope', async () => {
    const res = await request(app)
      .get('/api/v1/admin/support/tickets')
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(4);

    const foundTkt = res.body.data.find((t: { id: string }) => t.id === ticketOpenId);
    expect(foundTkt).toBeDefined();
    expect(foundTkt.subject).toContain(`Billing dispute for account ${uniqueSuffix}`);
    expect(foundTkt.category).toBe('Billing');
    expect(foundTkt._count).toHaveProperty('messages');
  });

  // ---------------------------------------------------------------------------
  // Case 5: Status and category filters return appropriate records
  // ---------------------------------------------------------------------------
  it('INT-SUP-05: Status and category filters return matching records from PostgreSQL', async () => {
    // 5a. Filter by status=OPEN
    const resStatus = await request(app)
      .get('/api/v1/admin/support/tickets?status=OPEN')
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(resStatus.status).toBe(200);
    expect(resStatus.body.data.every((t: { status: string }) => t.status === 'OPEN')).toBe(true);
    expect(resStatus.body.data.some((t: { id: string }) => t.id === ticketOpenId)).toBe(true);
    expect(resStatus.body.data.some((t: { id: string }) => t.id === ticketResolvedId)).toBe(false);

    // 5b. Filter by category=Billing
    const resCat = await request(app)
      .get('/api/v1/admin/support/tickets?category=Billing')
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(resCat.status).toBe(200);
    expect(resCat.body.data.every((t: { category: string }) => t.category.toLowerCase() === 'billing')).toBe(true);
    expect(resCat.body.data.some((t: { id: string }) => t.id === ticketOpenId)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Case 6: Text search returns matching records
  // ---------------------------------------------------------------------------
  it('INT-SUP-06: Text search matches ticket subject or related customer info', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/support/tickets?search=${encodeURIComponent(uniqueSuffix)}`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    console.log('INT-SUP-06 uniqueSuffix:', uniqueSuffix);
    console.log('INT-SUP-06 pagination:', res.body.pagination);
    console.log('INT-SUP-06 returned:', res.body.data?.map((t: any) => ({ id: t.id, subject: t.subject })));
    const rawFind = await prisma.supportTicket.findUnique({ where: { id: ticketEscalatedId } });
    console.log('INT-SUP-06 ticketEscalated raw in DB:', rawFind?.id, rawFind?.subject);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    // Verify search matching specific subject phrase
    const resSpecific = await request(app)
      .get(`/api/v1/admin/support/tickets?search=${encodeURIComponent('Hardware offline')}`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(resSpecific.status).toBe(200);
    expect(resSpecific.body.data.some((t: { id: string }) => t.id === ticketEscalatedId)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Case 7: Ticket detail includes message timeline in expected order; missing ticket returns 404
  // ---------------------------------------------------------------------------
  it('INT-SUP-07: Ticket detail returns ordered timeline; nonexistent returns 404', async () => {
    // 7a. Valid ticket detail
    const res = await request(app)
      .get(`/api/v1/admin/support/tickets/${ticketOpenId}`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(ticketOpenId);
    expect(res.body.data.messages).toHaveLength(2);

    // Verify chronology: first message must precede second message
    const msg1Date = new Date(res.body.data.messages[0].createdAt).getTime();
    const msg2Date = new Date(res.body.data.messages[1].createdAt).getTime();
    expect(msg1Date).toBeLessThanOrEqual(msg2Date);
    expect(res.body.data.messages[0].senderType).toBe('CUSTOMER');
    expect(res.body.data.messages[1].senderType).toBe('ADMIN');

    // 7b. Nonexistent ticket detail returns 404
    const resNotFound = await request(app)
      .get('/api/v1/admin/support/tickets/nonexistent_tkt_cuid99')
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.success).toBe(false);
    expect(resNotFound.body.error.code).toBe('NOT_FOUND');
  });

  // ---------------------------------------------------------------------------
  // Case 8: Message creation persists message, derives senderType=ADMIN & actor identity
  // ---------------------------------------------------------------------------
  it('INT-SUP-08: Message creation enforces senderType=ADMIN and actor senderId against spoofing', async () => {
    const spoofAttempt = {
      message: 'Admin response investigating issue.',
      senderType: 'CUSTOMER',
      senderId: regularUserId,
    };

    const res = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketOpenId}/messages`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send(spoofAttempt);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketId).toBe(ticketOpenId);
    expect(res.body.data.message).toBe('Admin response investigating issue.');

    // Security invariant: senderType must be ADMIN and senderId must be the authenticated actor
    expect(res.body.data.senderType).toBe('ADMIN');
    expect(res.body.data.senderId).toBe(activeSuperAdminId);

    // Database verification directly in PostgreSQL
    const savedMsg = await prisma.ticketMessage.findUnique({
      where: { id: res.body.data.id },
    });
    expect(savedMsg).toBeDefined();
    expect(savedMsg?.senderType).toBe('ADMIN');
    expect(savedMsg?.senderId).toBe(activeSuperAdminId);
  });

  // ---------------------------------------------------------------------------
  // Case 9: Empty or invalid message input is rejected
  // ---------------------------------------------------------------------------
  it('INT-SUP-09: Empty or whitespace-only message input is rejected with 400', async () => {
    // 9a. Empty string
    const resEmpty = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketOpenId}/messages`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ message: '' });

    expect(resEmpty.status).toBe(400);
    expect(resEmpty.body.success).toBe(false);

    // 9b. Whitespace only
    const resWhitespace = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketOpenId}/messages`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ message: '     ' });

    expect(resWhitespace.status).toBe(400);
    expect(resWhitespace.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Case 10: Valid assignment persists assignee and produces audit event
  // ---------------------------------------------------------------------------
  it('INT-SUP-10: Valid assignment persists assignee and records audit log in PostgreSQL', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/assign`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ assignedToId: secondarySuperAdminId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedToId).toBe(secondarySuperAdminId);

    // Database verification in PostgreSQL
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketForLifecycleId },
    });
    expect(dbTicket?.assignedToId).toBe(secondarySuperAdminId);

    // Audit verification in PostgreSQL
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'SupportTicket',
        entityId: ticketForLifecycleId,
        action: 'support_ticket.assigned',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRecord).toBeDefined();
    expect(auditRecord?.actorId).toBe(activeSuperAdminId);
    const meta = auditRecord?.metadata as { newAssignedToId?: string; unassigned?: boolean };
    expect(meta.newAssignedToId).toBe(secondarySuperAdminId);
    expect(meta.unassigned).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Case 11: Invalid or unauthorized assignee is rejected
  // ---------------------------------------------------------------------------
  it('INT-SUP-11: Invalid assignee (non-admin or non-existent) is rejected with 400', async () => {
    // 11a. Assigning regular non-super-admin user
    const resNonAdmin = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/assign`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ assignedToId: regularUserId });

    expect(resNonAdmin.status).toBe(400);
    expect(resNonAdmin.body.success).toBe(false);
    expect(resNonAdmin.body.error.message).toMatch(/Only platform Super Admins/i);

    // 11b. Assigning non-existent user
    const resMissing = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/assign`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ assignedToId: 'nonexistent_user_cuid99' });

    expect(resMissing.status).toBe(400);
    expect(resMissing.body.success).toBe(false);
    expect(resMissing.body.error.message).toMatch(/does not exist or is inactive/i);
  });

  // ---------------------------------------------------------------------------
  // Case 12: Unassignment persists assignedToId = null and produces audit event
  // ---------------------------------------------------------------------------
  it('INT-SUP-12: Unassignment sets assignedToId=null and produces audit event in PostgreSQL', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/assign`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ assignedToId: null });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assignedToId).toBeNull();

    // Database verification in PostgreSQL
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketForLifecycleId },
    });
    expect(dbTicket?.assignedToId).toBeNull();

    // Audit verification in PostgreSQL
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'SupportTicket',
        entityId: ticketForLifecycleId,
        action: 'support_ticket.assigned',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRecord).toBeDefined();
    const meta = auditRecord?.metadata as { newAssignedToId?: string | null; unassigned?: boolean };
    expect(meta.newAssignedToId).toBeNull();
    expect(meta.unassigned).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Case 13: Valid transition to RESOLVED persists status, sets resolvedAt & audit event
  // ---------------------------------------------------------------------------
  it('INT-SUP-13: Transition to RESOLVED sets status, resolvedAt timestamp, and records audit event', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/status`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ status: 'RESOLVED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolvedAt).not.toBeNull();

    // Database verification in PostgreSQL
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketForLifecycleId },
    });
    expect(dbTicket?.status).toBe('RESOLVED');
    expect(dbTicket?.resolvedAt).toBeInstanceOf(Date);

    // Audit verification in PostgreSQL
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'SupportTicket',
        entityId: ticketForLifecycleId,
        action: 'support_ticket.status_updated',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRecord).toBeDefined();
    const meta = auditRecord?.metadata as { previousStatus?: string; newStatus?: string; resolvedAt?: string };
    expect(meta.previousStatus).toBe('OPEN');
    expect(meta.newStatus).toBe('RESOLVED');
    expect(meta.resolvedAt).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Case 14: Reopening resolved ticket to IN_PROGRESS clears resolvedAt & records audit event
  // ---------------------------------------------------------------------------
  it('INT-SUP-14: Reopening resolved ticket to IN_PROGRESS clears resolvedAt and logs reopened audit', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/status`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.resolvedAt).toBeNull();

    // Database verification in PostgreSQL
    const dbTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketForLifecycleId },
    });
    expect(dbTicket?.status).toBe('IN_PROGRESS');
    expect(dbTicket?.resolvedAt).toBeNull();

    // Audit verification in PostgreSQL
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        entity: 'SupportTicket',
        entityId: ticketForLifecycleId,
        action: 'support_ticket.status_updated',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRecord).toBeDefined();
    const meta = auditRecord?.metadata as { previousStatus?: string; newStatus?: string; reopened?: boolean };
    expect(meta.previousStatus).toBe('RESOLVED');
    expect(meta.newStatus).toBe('IN_PROGRESS');
    expect(meta.reopened).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Case 15: Repeating an already-applied status transition follows idempotent behavior
  // ---------------------------------------------------------------------------
  it('INT-SUP-15: Repeating current status returns 200 idempotently without duplicate audit log', async () => {
    // Count existing audit logs for this ticket
    const countBefore = await prisma.auditLog.count({
      where: {
        entity: 'SupportTicket',
        entityId: ticketForLifecycleId,
        action: 'support_ticket.status_updated',
      },
    });

    const res = await request(app)
      .patch(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/status`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');

    const countAfter = await prisma.auditLog.count({
      where: {
        entity: 'SupportTicket',
        entityId: ticketForLifecycleId,
        action: 'support_ticket.status_updated',
      },
    });
    // Idempotent: no new audit log record created
    expect(countAfter).toBe(countBefore);
  });

  // ---------------------------------------------------------------------------
  // Case 16: Invalid status transitions or unsupported statuses are rejected
  // ---------------------------------------------------------------------------
  it('INT-SUP-16: Unsupported status value is rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/support/tickets/${ticketForLifecycleId}/status`)
      .set('Authorization', `Bearer ${activeSuperAdminToken}`)
      .send({ status: 'CLOSED' }); // CLOSED is not supported; only OPEN, IN_PROGRESS, ESCALATED, RESOLVED

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Case 17: AI escalation queue returns matching escalated tickets
  // ---------------------------------------------------------------------------
  it('INT-SUP-17: AI escalation queue returns only tickets flagged aiEscalated=true', async () => {
    const res = await request(app)
      .get('/api/v1/admin/support/ai-escalations')
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every((t: { aiEscalated: boolean }) => t.aiEscalated === true)).toBe(true);
    expect(res.body.data.some((t: { id: string }) => t.id === ticketEscalatedId)).toBe(true);
    expect(res.body.data.some((t: { id: string }) => t.id === ticketOpenId)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Case 18: Analytics returns accurate counts and breakdowns with unconfigured SLA
  // ---------------------------------------------------------------------------
  it('INT-SUP-18: Analytics returns accurate counts with null/unconfigured SLA & AI containment', async () => {
    const res = await request(app)
      .get('/api/v1/admin/support/analytics')
      .set('Authorization', `Bearer ${activeSuperAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Numerical counts must be non-negative integers
    expect(typeof data.totalTickets).toBe('number');
    expect(data.totalTickets).toBeGreaterThanOrEqual(4);
    expect(typeof data.openTickets).toBe('number');
    expect(typeof data.inProgressTickets).toBe('number');
    expect(typeof data.escalatedTickets).toBe('number');
    expect(typeof data.resolvedTickets).toBe('number');
    expect(typeof data.aiEscalatedCount).toBe('number');
    expect(typeof data.unassignedCount).toBe('number');

    // Category and Priority maps
    expect(data.byCategory).toBeTypeOf('object');
    expect(data.byCategory['Billing']).toBeGreaterThanOrEqual(1);
    expect(data.byPriority).toBeTypeOf('object');
    expect(data.byPriority['HIGH']).toBeGreaterThanOrEqual(1);

    // Explicit deferred SLA and AI metrics
    expect(data.firstResponse).toEqual({
      percentage: null,
      status: 'UNCONFIGURED',
      reason: 'Authoritative SLA window not defined',
    });
    expect(data.aiContainment).toEqual({
      percentage: null,
      status: 'UNAVAILABLE',
      reason: 'Customer AI conversation data deferred',
    });
  });
});
