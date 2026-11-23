import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { adminAiRepository } from './adminAi.repository';
import type {
  CreateEscalationRuleInput,
  CreateKnowledgeArticleInput,
  ListKnowledgeQueryInput,
  UpdateEscalationRuleInput,
  UpdateIntentThresholdInput,
  UpdateKnowledgeArticleInput,
  UpdateKnowledgeStatusInput,
  UpdateToolPermissionsInput,
} from './adminAi.schema';

export const adminAiService = {
  // ---------------------------------------------------------------------------
  // Knowledge Base
  // ---------------------------------------------------------------------------

  async listKnowledgeArticles(query: ListKnowledgeQueryInput) {
    const where: Prisma.AiKnowledgeArticleWhereInput = {};

    if (query.category) {
      where.category = query.category;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { question: { contains: query.search, mode: 'insensitive' } },
        { answer: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [items, total] = await Promise.all([
      adminAiRepository.findKnowledgeArticles({ where, skip, take }),
      adminAiRepository.countKnowledgeArticles(where),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  },

  async getKnowledgeArticleById(id: string) {
    const article = await adminAiRepository.findKnowledgeArticleById(id);
    if (!article) {
      throw ApiError.notFound('Knowledge article');
    }
    return article;
  },

  async createKnowledgeArticle(input: CreateKnowledgeArticleInput, actorId?: string) {
    // If published, trimmed answer must have >= 10 characters
    if (input.status === 'published') {
      const trimmedAnswer = (input.answer ?? '').trim();
      if (trimmedAnswer.length < 10) {
        throw ApiError.badRequest('Published articles require a trimmed answer containing at least 10 characters');
      }
    }

    return prisma.$transaction(async (tx) => {
      const article = await adminAiRepository.createKnowledgeArticle(
        {
          question: input.question,
          answer: input.answer ?? null,
          category: input.category,
          status: input.status,
        },
        tx,
      );

      // Audit event: Never put full article content/answer into audit metadata
      await auditService.record(
        {
          action: 'ai_knowledge_article.created',
          entity: 'AiKnowledgeArticle',
          entityId: article.id,
          actorId,
          metadata: {
            question: article.question,
            category: article.category,
            status: article.status,
            hasAnswer: !!article.answer,
            answerLength: article.answer ? article.answer.length : 0,
          },
        },
        tx,
      );

      return article;
    });
  },

  async updateKnowledgeArticle(id: string, input: UpdateKnowledgeArticleInput, actorId?: string) {
    const existing = await adminAiRepository.findKnowledgeArticleById(id);
    if (!existing) {
      throw ApiError.notFound('Knowledge article');
    }

    const effectiveStatus = input.status !== undefined ? input.status : existing.status;
    const effectiveAnswer = input.answer !== undefined ? input.answer : existing.answer;

    if (effectiveStatus === 'published') {
      const trimmed = (effectiveAnswer ?? '').trim();
      if (trimmed.length < 10) {
        throw ApiError.badRequest('Published articles require a trimmed answer containing at least 10 characters');
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminAiRepository.updateKnowledgeArticle(
        id,
        {
          question: input.question,
          answer: input.answer !== undefined ? input.answer : undefined,
          category: input.category,
          status: input.status,
        },
        tx,
      );

      // Audit: omit full answer from metadata
      await auditService.record(
        {
          action: 'ai_knowledge_article.updated',
          entity: 'AiKnowledgeArticle',
          entityId: id,
          actorId,
          metadata: {
            previousStatus: existing.status,
            newStatus: updated.status,
            previousCategory: existing.category,
            newCategory: updated.category,
            question: updated.question,
            hasAnswer: !!updated.answer,
            answerLength: updated.answer ? updated.answer.length : 0,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async updateKnowledgeStatus(id: string, input: UpdateKnowledgeStatusInput, actorId?: string) {
    const existing = await adminAiRepository.findKnowledgeArticleById(id);
    if (!existing) {
      throw ApiError.notFound('Knowledge article');
    }

    if (input.status === 'published') {
      const trimmed = (existing.answer ?? '').trim();
      if (trimmed.length < 10) {
        throw ApiError.badRequest('Published articles require a trimmed answer containing at least 10 characters');
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminAiRepository.updateKnowledgeArticle(
        id,
        { status: input.status },
        tx,
      );

      await auditService.record(
        {
          action: 'ai_knowledge_article.status_updated',
          entity: 'AiKnowledgeArticle',
          entityId: id,
          actorId,
          metadata: {
            previousStatus: existing.status,
            newStatus: input.status,
            question: existing.question,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async deleteKnowledgeArticle(id: string, actorId?: string) {
    const existing = await adminAiRepository.findKnowledgeArticleById(id);
    if (!existing) {
      throw ApiError.notFound('Knowledge article');
    }

    return prisma.$transaction(async (tx) => {
      await adminAiRepository.deleteKnowledgeArticle(id, tx);

      await auditService.record(
        {
          action: 'ai_knowledge_article.deleted',
          entity: 'AiKnowledgeArticle',
          entityId: id,
          actorId,
          metadata: {
            question: existing.question,
            category: existing.category,
            status: existing.status,
          },
        },
        tx,
      );

      return { id };
    });
  },

  // ---------------------------------------------------------------------------
  // Intent Catalog
  // ---------------------------------------------------------------------------

  async listIntents() {
    return adminAiRepository.findIntents();
  },

  async updateIntentThreshold(id: string, input: UpdateIntentThresholdInput, actorId?: string) {
    const existing = await adminAiRepository.findIntentById(id);
    if (!existing) {
      throw ApiError.notFound('Intent');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminAiRepository.updateIntentThreshold(id, input.threshold, tx);

      await auditService.record(
        {
          action: 'ai_intent.threshold_updated',
          entity: 'AiIntent',
          entityId: id,
          actorId,
          metadata: {
            intentName: existing.name,
            tool: existing.tool,
            previousThreshold: existing.threshold,
            newThreshold: input.threshold,
          },
        },
        tx,
      );

      return updated;
    });
  },

  // ---------------------------------------------------------------------------
  // Tool Permissions
  // ---------------------------------------------------------------------------

  async listToolPermissions() {
    return adminAiRepository.findToolPermissions();
  },

  async updateToolPermissions(
    toolKey: string,
    input: UpdateToolPermissionsInput,
    actorId?: string,
  ) {
    const existing = await adminAiRepository.findToolPermissionByKey(toolKey);
    if (!existing) {
      throw ApiError.notFound(`Tool permission for '${toolKey}'`);
    }

    // Validation rules:
    // 1. read:false forces write:false
    // 2. Reject read:false, write:true
    // 3. Reject enabling write:true when persisted read is false and read is not enabled
    if (input.read === false && input.write === true) {
      throw ApiError.badRequest('Write access cannot be enabled when read access is disabled');
    }

    if (input.write === true && input.read === undefined && !existing.read) {
      throw ApiError.badRequest('Write access cannot be enabled when read access is disabled');
    }

    let newRead = existing.read;
    let newWrite = existing.write;

    if (input.read !== undefined) {
      newRead = input.read;
      if (newRead === false) {
        newWrite = false;
      }
    }

    if (input.write !== undefined) {
      if (newRead === false && input.write === true) {
        throw ApiError.badRequest('Write access cannot be enabled when read access is disabled');
      }
      newWrite = input.write;
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminAiRepository.updateToolPermissions(
        toolKey,
        { read: newRead, write: newWrite },
        tx,
      );

      await auditService.record(
        {
          action: 'ai_tool.permissions_updated',
          entity: 'AiToolPermission',
          entityId: existing.id,
          actorId,
          metadata: {
            toolKey,
            toolName: existing.name,
            previousRead: existing.read,
            newRead: updated.read,
            previousWrite: existing.write,
            newWrite: updated.write,
          },
        },
        tx,
      );

      return updated;
    });
  },

  // ---------------------------------------------------------------------------
  // Escalation Rules
  // ---------------------------------------------------------------------------

  async listEscalationRules() {
    return adminAiRepository.findEscalationRules();
  },

  async createEscalationRule(input: CreateEscalationRuleInput, actorId?: string) {
    return prisma.$transaction(async (tx) => {
      const rule = await adminAiRepository.createEscalationRule(
        {
          condition: input.condition,
          action: input.action,
          active: input.active,
        },
        tx,
      );

      // Audit: Do not expose sensitive rule action strings in audit logs
      await auditService.record(
        {
          action: 'ai_escalation_rule.created',
          entity: 'AiEscalationRule',
          entityId: rule.id,
          actorId,
          metadata: {
            condition: rule.condition,
            active: rule.active,
            actionLength: rule.action.length,
          },
        },
        tx,
      );

      return rule;
    });
  },

  async updateEscalationRule(id: string, input: UpdateEscalationRuleInput, actorId?: string) {
    const existing = await adminAiRepository.findEscalationRuleById(id);
    if (!existing) {
      throw ApiError.notFound('Escalation rule');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await adminAiRepository.updateEscalationRule(
        id,
        {
          condition: input.condition,
          action: input.action,
          active: input.active,
        },
        tx,
      );

      // Audit: avoid sensitive action details in metadata
      await auditService.record(
        {
          action: 'ai_escalation_rule.updated',
          entity: 'AiEscalationRule',
          entityId: id,
          actorId,
          metadata: {
            condition: updated.condition,
            active: updated.active,
            actionLength: updated.action.length,
          },
        },
        tx,
      );

      return updated;
    });
  },

  async deleteEscalationRule(id: string, actorId?: string) {
    const existing = await adminAiRepository.findEscalationRuleById(id);
    if (!existing) {
      throw ApiError.notFound('Escalation rule');
    }

    return prisma.$transaction(async (tx) => {
      await adminAiRepository.deleteEscalationRule(id, tx);

      await auditService.record(
        {
          action: 'ai_escalation_rule.deleted',
          entity: 'AiEscalationRule',
          entityId: id,
          actorId,
          metadata: {
            condition: existing.condition,
            active: existing.active,
          },
        },
        tx,
      );

      return { id };
    });
  },

  // ---------------------------------------------------------------------------
  // Analytics & Dashboard
  // ---------------------------------------------------------------------------

  async getAnalytics() {
    const counts = await adminAiRepository.getAnalyticsCounts();

    return {
      ...counts,
      telemetry: {
        status: 'Unavailable (Deferred)',
        reason: 'Runtime telemetry deferred',
        containmentRate: null,
        avgResponseTimeMs: null,
        conversationsCount: null,
        escalationRate: null,
      },
    };
  },
};
