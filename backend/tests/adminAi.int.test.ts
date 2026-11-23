import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';
import { seedAiCatalog } from '../scripts/seed-ai';

describe('Fioner AI Governance — Real PostgreSQL Integration Suite (fioner_test)', () => {
  const app = createApp();

  const uniqueSuffix = `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let superAdminId: string;
  let superAdminEmail: string;
  let superAdminToken: string;

  let regularUserId: string;
  let regularUserEmail: string;
  let regularUserToken: string;

  const createdArticleIds: string[] = [];
  const createdRuleIds: string[] = [];

  beforeAll(async () => {
    // 1. Mandatory Safety Gate Verification
    const dbIdentity = await prisma.$queryRaw<Array<{ current_database: string; inet_server_port: number }>>`
      SELECT current_database(), inet_server_port();
    `;
    const activeDb = dbIdentity[0]?.current_database;
    if (activeDb !== 'fioner_test') {
      throw new Error(`SAFETY ABORT: Test target database is '${activeDb}', expected 'fioner_test'.`);
    }

    // 2. Ensure AI Catalog is seeded
    await seedAiCatalog();

    // 3. Create Super Admin actor
    superAdminEmail = `superadmin_${uniqueSuffix}@fioner.test`;
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'AI',
        lastName: 'SuperAdmin',
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;
    superAdminToken = signAccessToken({
      sub: superAdmin.id,
      email: superAdmin.email,
      isSuperAdmin: true,
    });

    // 4. Create Regular User actor
    regularUserEmail = `regular_${uniqueSuffix}@fioner.test`;
    const regular = await prisma.user.create({
      data: {
        email: regularUserEmail,
        passwordHash: 'hashed_password_integration',
        firstName: 'Regular',
        lastName: 'User',
        isSuperAdmin: false,
        isActive: true,
      },
    });
    regularUserId = regular.id;
    regularUserToken = signAccessToken({
      sub: regular.id,
      email: regular.email,
      isSuperAdmin: false,
    });
  });

  afterAll(async () => {
    // Reverse dependency cleanup
    if (createdArticleIds.length > 0) {
      await prisma.aiKnowledgeArticle.deleteMany({
        where: { id: { in: createdArticleIds } },
      });
    }

    if (createdRuleIds.length > 0) {
      await prisma.aiEscalationRule.deleteMany({
        where: { id: { in: createdRuleIds } },
      });
    }

    // Delete audit logs created during this test
    await prisma.auditLog.deleteMany({
      where: {
        actorId: { in: [superAdminId, regularUserId].filter(Boolean) },
      },
    });

    // Delete test users
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, regularUserId].filter(Boolean) } },
    });
  });

  describe('Authorization Barriers', () => {
    it('blocks unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/admin/ai/analytics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('blocks regular non-super-admin with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ai/analytics')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Knowledge Base Lifecycle & Audit Content Protection', () => {
    it('creates a published article with valid answer and verifies audit metadata omission', async () => {
      const res = await request(app)
        .post('/api/v1/admin/ai/knowledge')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: `How to replace QR sticker? ${uniqueSuffix}`,
          answer: 'Detailed procedure to replace damaged QR sticker with minimum 10 chars.',
          category: 'Product',
          status: 'published',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const article = res.body.data;
      expect(article.id).toBeDefined();
      createdArticleIds.push(article.id);

      // Verify audit log exists and DOES NOT contain full answer text
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'ai_knowledge_article.created',
          entityId: article.id,
        },
      });

      expect(audit).not.toBeNull();
      const meta = audit?.metadata as any;
      expect(meta?.question).toBe(article.question);
      expect(meta?.category).toBe('Product');
      expect(meta?.status).toBe('published');
      expect(meta?.hasAnswer).toBe(true);
      expect(meta?.answer).toBeUndefined(); // Answer text must NOT be stored in audit metadata
    });

    it('rejects creating published article if answer is null or less than 10 characters', async () => {
      const res = await request(app)
        .post('/api/v1/admin/ai/knowledge')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: `Short article ${uniqueSuffix}`,
          answer: 'Too short',
          category: 'Safety',
          status: 'published',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('allows creating draft article without answer', async () => {
      const res = await request(app)
        .post('/api/v1/admin/ai/knowledge')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: `Draft article without answer ${uniqueSuffix}`,
          category: 'Billing',
          status: 'draft',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const draft = res.body.data;
      createdArticleIds.push(draft.id);
      expect(draft.status).toBe('draft');
      expect(draft.answer).toBeNull();
    });

    it('blocks transitioning draft to published if answer is missing or under 10 chars', async () => {
      const draft = await prisma.aiKnowledgeArticle.create({
        data: {
          question: `Empty draft ${uniqueSuffix}`,
          answer: 'Short',
          category: 'Account',
          status: 'draft',
        },
      });
      createdArticleIds.push(draft.id);

      const res = await request(app)
        .patch(`/api/v1/admin/ai/knowledge/${draft.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'published' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('updates draft with valid answer and transitions status', async () => {
      const draft = await prisma.aiKnowledgeArticle.create({
        data: {
          question: `Draft to publish ${uniqueSuffix}`,
          answer: null,
          category: 'Account',
          status: 'draft',
        },
      });
      createdArticleIds.push(draft.id);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/ai/knowledge/${draft.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          answer: 'This is a complete and valid answer with more than 10 characters.',
          status: 'published',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('published');

      const getRes = await request(app)
        .get(`/api/v1/admin/ai/knowledge/${draft.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe('published');
    });

    it('deletes knowledge article', async () => {
      const article = await prisma.aiKnowledgeArticle.create({
        data: {
          question: `To be deleted ${uniqueSuffix}`,
          category: 'Safety',
          status: 'draft',
        },
      });

      const delRes = await request(app)
        .delete(`/api/v1/admin/ai/knowledge/${article.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delRes.status).toBe(200);

      const check = await prisma.aiKnowledgeArticle.findUnique({
        where: { id: article.id },
      });
      expect(check).toBeNull();
    });
  });

  describe('Intent Catalog & Threshold Precision', () => {
    it('verifies exact 10 approved intents and mappings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ai/intents')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(10);

      const names = res.body.data.map((i: any) => i.name).sort();
      expect(names).toEqual([
        'faq.lookup',
        'fastag.recharge',
        'fuel.estimate',
        'gps.status',
        'membership.status',
        'order.status',
        'poi.search',
        'support.ticket.create',
        'toll.estimate',
        'trip.plan',
      ]);
    });

    it('tunes threshold with floating-point value and preserves precision without rounding', async () => {
      const intent = await prisma.aiIntent.findFirstOrThrow({
        where: { name: 'trip.plan' },
      });

      const targetThreshold = 0.812345;

      const res = await request(app)
        .patch(`/api/v1/admin/ai/intents/${intent.id}/threshold`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ threshold: targetThreshold });

      expect(res.status).toBe(200);
      expect(res.body.data.threshold).toBeCloseTo(targetThreshold, 5);

      const dbCheck = await prisma.aiIntent.findUnique({
        where: { id: intent.id },
      });
      expect(dbCheck?.threshold).toBeCloseTo(targetThreshold, 5);
    });

    it('rejects threshold outside [0, 1]', async () => {
      const intent = await prisma.aiIntent.findFirstOrThrow();

      const resNegative = await request(app)
        .patch(`/api/v1/admin/ai/intents/${intent.id}/threshold`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ threshold: -0.1 });
      expect(resNegative.status).toBe(400);

      const resAbove = await request(app)
        .patch(`/api/v1/admin/ai/intents/${intent.id}/threshold`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ threshold: 1.0001 });
      expect(resAbove.status).toBe(400);
    });
  });

  describe('Tool Permissions Integrity & Invariant Enforcement', () => {
    it('verifies exact 8 approved tools exist in catalog', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ai/tools')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(8);

      const toolKeys = res.body.data.map((t: any) => t.toolKey).sort();
      expect(toolKeys).toEqual([
        'fastag_recharge',
        'gps_status_lookup',
        'membership_lookup',
        'order_lookup',
        'payment_refund',
        'ticket_creator',
        'toll_estimator',
        'trip_planner',
      ]);
    });

    it('returns 404 for unknown toolKey without registering it', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/unknown_malicious_tool/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ read: true, write: true });

      expect(res.status).toBe(404);

      const check = await prisma.aiToolPermission.findUnique({
        where: { toolKey: 'unknown_malicious_tool' },
      });
      expect(check).toBeNull();
    });

    it('enforces read:false forces write:false and rejects read:false, write:true', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/trip_planner/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ read: false, write: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects enabling write:true when persisted read is false', async () => {
      // First ensure read and write are false
      await prisma.aiToolPermission.update({
        where: { toolKey: 'payment_refund' },
        data: { read: false, write: false },
      });

      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/payment_refund/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ write: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('permits read:true, write:true for known tools', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/trip_planner/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ read: true, write: true });

      expect(res.status).toBe(200);
      expect(res.body.data.read).toBe(true);
      expect(res.body.data.write).toBe(true);
    });

    it('partial update setting read:false automatically forces write:false', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/trip_planner/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ read: false });

      expect(res.status).toBe(200);
      expect(res.body.data.read).toBe(false);
      expect(res.body.data.write).toBe(false);
    });
  });

  describe('Escalation Rules & Audit Sensitive Action Protection', () => {
    it('creates rule and omits sensitive action content from audit metadata', async () => {
      const res = await request(app)
        .post('/api/v1/admin/ai/escalation-rules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          condition: `Customer requests immediate refund ${uniqueSuffix}`,
          action: 'Escalate to supervisor with full priority dispatch token',
          active: true,
        });

      expect(res.status).toBe(201);
      const rule = res.body.data;
      createdRuleIds.push(rule.id);

      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'ai_escalation_rule.created',
          entityId: rule.id,
        },
      });

      expect(audit).not.toBeNull();
      const meta = audit?.metadata as any;
      expect(meta?.condition).toBe(rule.condition);
      expect(meta?.action).toBeUndefined(); // Sensitive rule action must NOT be logged in plaintext
    });

    it('updates and deletes escalation rule', async () => {
      const rule = await prisma.aiEscalationRule.create({
        data: {
          condition: `Condition ${uniqueSuffix}`,
          action: 'Action',
          active: true,
        },
      });
      createdRuleIds.push(rule.id);

      const updateRes = await request(app)
        .patch(`/api/v1/admin/ai/escalation-rules/${rule.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ active: false });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.active).toBe(false);

      const delRes = await request(app)
        .delete(`/api/v1/admin/ai/escalation-rules/${rule.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delRes.status).toBe(200);

      const check = await prisma.aiEscalationRule.findUnique({
        where: { id: rule.id },
      });
      expect(check).toBeNull();
    });
  });

  describe('Dashboard Analytics & Truthful Deferred Telemetry', () => {
    it('returns database-derived counts and explicit Unavailable (Deferred) telemetry', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ai/analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(typeof data.knowledge.total).toBe('number');
      expect(data.intents.total).toBe(10);
      expect(data.tools.total).toBe(8);

      // Verify honest deferred telemetry
      expect(data.telemetry).toEqual({
        status: 'Unavailable (Deferred)',
        reason: 'Runtime telemetry deferred',
        containmentRate: null,
        avgResponseTimeMs: null,
        conversationsCount: null,
        escalationRate: null,
      });
    });
  });
});
