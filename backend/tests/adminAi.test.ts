import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { adminAiService } from '../src/modules/admin/ai/adminAi.service';
import { auditService } from '../src/modules/audit/audit.service';
import { prisma } from '../src/config/database';

vi.mock('../src/modules/admin/ai/adminAi.service');
vi.mock('../src/modules/audit/audit.service');

describe('Admin AI Governance Module (Phase 3A)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'super_admin_ai_test',
    email: 'super_admin_ai@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const regularUser = {
    id: 'regular_user_ai_test',
    email: 'regular_user_ai@fioner.test',
    isSuperAdmin: false,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: regularUser.id,
    email: regularUser.email,
    isSuperAdmin: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(prisma.user, 'findUnique').mockImplementation((async (args: any) => {
      const id = args?.where?.id;
      if (id === superAdminUser.id) return superAdminUser as never;
      if (id === regularUser.id) return regularUser as never;
      return null as never;
    }) as any);
  });

  describe('Authentication and Super Admin Authorization', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/ai/analytics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-super-admin authenticated requests with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ai/analytics')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows active Super Admin requests', async () => {
      vi.mocked(adminAiService.getAnalytics).mockResolvedValueOnce({
        knowledge: { total: 10, published: 8, draft: 2 },
        intents: { total: 10 },
        tools: { total: 8 },
        escalationRules: { total: 5, active: 4 },
        telemetry: {
          status: 'Unavailable (Deferred)',
          reason: 'Runtime telemetry deferred',
          containmentRate: null,
          avgResponseTimeMs: null,
          conversationsCount: null,
          escalationRate: null,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/ai/analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.telemetry.status).toBe('Unavailable (Deferred)');
    });
  });

  describe('Knowledge Base Endpoints', () => {
    it('lists knowledge articles with pagination and filtering', async () => {
      vi.mocked(adminAiService.listKnowledgeArticles).mockResolvedValueOnce({
        items: [
          {
            id: 'kb_1',
            question: 'How to activate QR?',
            answer: 'Scan the sticker and follow the prompt.',
            category: 'Product',
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/ai/knowledge?category=Product&status=published')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(adminAiService.listKnowledgeArticles).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Product', status: 'published' }),
      );
    });

    it('rejects creating published article if answer is under 10 characters', async () => {
      const res = await request(app)
        .post('/api/v1/admin/ai/knowledge')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: 'Short answer question?',
          answer: 'Too short',
          category: 'Product',
          status: 'published',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(adminAiService.createKnowledgeArticle).not.toHaveBeenCalled();
    });

    it('allows creating draft article with null or empty answer', async () => {
      vi.mocked(adminAiService.createKnowledgeArticle).mockResolvedValueOnce({
        id: 'kb_draft_1',
        question: 'Draft without answer?',
        answer: null,
        category: 'Billing',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/admin/ai/knowledge')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          question: 'Draft without answer?',
          category: 'Billing',
          status: 'draft',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(adminAiService.createKnowledgeArticle).toHaveBeenCalled();
    });

    it('updates knowledge article status', async () => {
      vi.mocked(adminAiService.updateKnowledgeStatus).mockResolvedValueOnce({
        id: 'kb_1',
        question: 'Question',
        answer: 'Valid answer with more than 10 characters',
        category: 'Safety',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/admin/ai/knowledge/kb_1/status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'published' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(adminAiService.updateKnowledgeStatus).toHaveBeenCalledWith(
        'kb_1',
        { status: 'published' },
        superAdminUser.id,
      );
    });

    it('deletes knowledge article', async () => {
      vi.mocked(adminAiService.deleteKnowledgeArticle).mockResolvedValueOnce({ id: 'kb_1' });

      const res = await request(app)
        .delete('/api/v1/admin/ai/knowledge/kb_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(adminAiService.deleteKnowledgeArticle).toHaveBeenCalledWith('kb_1', superAdminUser.id);
    });
  });

  describe('Intent Catalog & Threshold Tuning', () => {
    it('lists intents', async () => {
      vi.mocked(adminAiService.listIntents).mockResolvedValueOnce([
        {
          id: 'int_1',
          name: 'trip.plan',
          tool: 'trip_planner',
          threshold: 0.82,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/ai/intents')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe('trip.plan');
    });

    it('updates intent threshold with any numeric float in [0, 1]', async () => {
      vi.mocked(adminAiService.updateIntentThreshold).mockResolvedValueOnce({
        id: 'int_1',
        name: 'trip.plan',
        tool: 'trip_planner',
        threshold: 0.8354,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/admin/ai/intents/int_1/threshold')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ threshold: 0.8354 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(adminAiService.updateIntentThreshold).toHaveBeenCalledWith(
        'int_1',
        { threshold: 0.8354 },
        superAdminUser.id,
      );
    });

    it('rejects threshold out of [0, 1] range', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/ai/intents/int_1/threshold')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ threshold: 1.5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(adminAiService.updateIntentThreshold).not.toHaveBeenCalled();
    });
  });

  describe('Tool Permissions Endpoints', () => {
    it('lists tool permissions', async () => {
      vi.mocked(adminAiService.listToolPermissions).mockResolvedValueOnce([
        {
          id: 'tool_1',
          toolKey: 'trip_planner',
          name: 'Trip Planner',
          read: true,
          write: false,
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/ai/tools')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].toolKey).toBe('trip_planner');
    });

    it('rejects read:false, write:true at schema validation level', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/trip_planner/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ read: false, write: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(adminAiService.updateToolPermissions).not.toHaveBeenCalled();
    });

    it('allows updating permissions to read:true, write:true', async () => {
      vi.mocked(adminAiService.updateToolPermissions).mockResolvedValueOnce({
        id: 'tool_1',
        toolKey: 'trip_planner',
        name: 'Trip Planner',
        read: true,
        write: true,
        updatedAt: new Date(),
      });

      const res = await request(app)
        .patch('/api/v1/admin/ai/tools/trip_planner/permissions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ read: true, write: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(adminAiService.updateToolPermissions).toHaveBeenCalledWith(
        'trip_planner',
        { read: true, write: true },
        superAdminUser.id,
      );
    });
  });

  describe('Escalation Rules Endpoints', () => {
    it('creates, lists, updates, and deletes escalation rules', async () => {
      vi.mocked(adminAiService.createEscalationRule).mockResolvedValueOnce({
        id: 'er_1',
        condition: 'Negative sentiment twice',
        action: 'Escalate to human supervisor',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const createRes = await request(app)
        .post('/api/v1/admin/ai/escalation-rules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          condition: 'Negative sentiment twice',
          action: 'Escalate to human supervisor',
          active: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);

      vi.mocked(adminAiService.updateEscalationRule).mockResolvedValueOnce({
        id: 'er_1',
        condition: 'Negative sentiment twice',
        action: 'Escalate to human supervisor',
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateRes = await request(app)
        .patch('/api/v1/admin/ai/escalation-rules/er_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ active: false });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.active).toBe(false);

      vi.mocked(adminAiService.deleteEscalationRule).mockResolvedValueOnce({ id: 'er_1' });

      const deleteRes = await request(app)
        .delete('/api/v1/admin/ai/escalation-rules/er_1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.id).toBe('er_1');
    });
  });
});
