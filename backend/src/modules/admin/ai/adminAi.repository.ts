import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export const adminAiRepository = {
  // Knowledge Base
  async findKnowledgeArticles(params: {
    where?: Prisma.AiKnowledgeArticleWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AiKnowledgeArticleOrderByWithRelationInput;
  }) {
    return prisma.aiKnowledgeArticle.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { updatedAt: 'desc' },
    });
  },

  async countKnowledgeArticles(where?: Prisma.AiKnowledgeArticleWhereInput) {
    return prisma.aiKnowledgeArticle.count({ where });
  },

  async findKnowledgeArticleById(id: string) {
    return prisma.aiKnowledgeArticle.findUnique({
      where: { id },
    });
  },

  async createKnowledgeArticle(
    data: Prisma.AiKnowledgeArticleCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.aiKnowledgeArticle.create({ data });
  },

  async updateKnowledgeArticle(
    id: string,
    data: Prisma.AiKnowledgeArticleUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.aiKnowledgeArticle.update({
      where: { id },
      data,
    });
  },

  async deleteKnowledgeArticle(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.aiKnowledgeArticle.delete({
      where: { id },
    });
  },

  // Intent Catalog
  async findIntents() {
    return prisma.aiIntent.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async findIntentById(id: string) {
    return prisma.aiIntent.findUnique({
      where: { id },
    });
  },

  async updateIntentThreshold(
    id: string,
    threshold: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.aiIntent.update({
      where: { id },
      data: { threshold },
    });
  },

  // Tool Permissions
  async findToolPermissions() {
    return prisma.aiToolPermission.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async findToolPermissionByKey(toolKey: string) {
    return prisma.aiToolPermission.findUnique({
      where: { toolKey },
    });
  },

  async updateToolPermissions(
    toolKey: string,
    data: { read?: boolean; write?: boolean },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.aiToolPermission.update({
      where: { toolKey },
      data,
    });
  },

  // Escalation Rules
  async findEscalationRules() {
    return prisma.aiEscalationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async findEscalationRuleById(id: string) {
    return prisma.aiEscalationRule.findUnique({
      where: { id },
    });
  },

  async createEscalationRule(
    data: Prisma.AiEscalationRuleCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.aiEscalationRule.create({ data });
  },

  async updateEscalationRule(
    id: string,
    data: Prisma.AiEscalationRuleUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.aiEscalationRule.update({
      where: { id },
      data,
    });
  },

  async deleteEscalationRule(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.aiEscalationRule.delete({
      where: { id },
    });
  },

  // Analytics
  async getAnalyticsCounts() {
    const [
      totalKnowledgeArticles,
      publishedArticles,
      draftArticles,
      totalIntents,
      totalTools,
      activeEscalationRules,
      totalEscalationRules,
    ] = await Promise.all([
      prisma.aiKnowledgeArticle.count(),
      prisma.aiKnowledgeArticle.count({ where: { status: 'published' } }),
      prisma.aiKnowledgeArticle.count({ where: { status: 'draft' } }),
      prisma.aiIntent.count(),
      prisma.aiToolPermission.count(),
      prisma.aiEscalationRule.count({ where: { active: true } }),
      prisma.aiEscalationRule.count(),
    ]);

    return {
      knowledge: {
        total: totalKnowledgeArticles,
        published: publishedArticles,
        draft: draftArticles,
      },
      intents: {
        total: totalIntents,
      },
      tools: {
        total: totalTools,
      },
      escalationRules: {
        total: totalEscalationRules,
        active: activeEscalationRules,
      },
    };
  },
};
