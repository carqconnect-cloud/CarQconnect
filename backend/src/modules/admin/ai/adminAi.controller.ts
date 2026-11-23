import type { Request, Response } from 'express';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { adminAiService } from './adminAi.service';
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

export const adminAiController = {
  // Analytics
  async getAnalytics(_req: Request, res: Response) {
    const analytics = await adminAiService.getAnalytics();
    return ApiResponse.ok(res, analytics);
  },

  // Knowledge Base
  async listKnowledge(req: Request, res: Response) {
    const query = req.query as unknown as ListKnowledgeQueryInput;
    const result = await adminAiService.listKnowledgeArticles(query);
    return ApiResponse.ok(res, result.items, result.pagination);
  },

  async getKnowledgeById(req: Request, res: Response) {
    const id = req.params.id as string;
    const article = await adminAiService.getKnowledgeArticleById(id);
    return ApiResponse.ok(res, article);
  },

  async createKnowledge(req: Request, res: Response) {
    const body = req.body as CreateKnowledgeArticleInput;
    const actorId = req.auth?.userId;
    const article = await adminAiService.createKnowledgeArticle(body, actorId);
    return ApiResponse.created(res, article);
  },

  async updateKnowledge(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateKnowledgeArticleInput;
    const actorId = req.auth?.userId;
    const updated = await adminAiService.updateKnowledgeArticle(id, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  async updateKnowledgeStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateKnowledgeStatusInput;
    const actorId = req.auth?.userId;
    const updated = await adminAiService.updateKnowledgeStatus(id, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  async deleteKnowledge(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const result = await adminAiService.deleteKnowledgeArticle(id, actorId);
    return ApiResponse.ok(res, result);
  },

  // Intents
  async listIntents(_req: Request, res: Response) {
    const intents = await adminAiService.listIntents();
    return ApiResponse.ok(res, intents);
  },

  async updateIntentThreshold(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateIntentThresholdInput;
    const actorId = req.auth?.userId;
    const updated = await adminAiService.updateIntentThreshold(id, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  // Tools
  async listTools(_req: Request, res: Response) {
    const tools = await adminAiService.listToolPermissions();
    return ApiResponse.ok(res, tools);
  },

  async updateToolPermissions(req: Request, res: Response) {
    const toolKey = req.params.toolKey as string;
    const body = req.body as UpdateToolPermissionsInput;
    const actorId = req.auth?.userId;
    const updated = await adminAiService.updateToolPermissions(toolKey, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  // Escalation Rules
  async listEscalationRules(_req: Request, res: Response) {
    const rules = await adminAiService.listEscalationRules();
    return ApiResponse.ok(res, rules);
  },

  async createEscalationRule(req: Request, res: Response) {
    const body = req.body as CreateEscalationRuleInput;
    const actorId = req.auth?.userId;
    const rule = await adminAiService.createEscalationRule(body, actorId);
    return ApiResponse.created(res, rule);
  },

  async updateEscalationRule(req: Request, res: Response) {
    const id = req.params.id as string;
    const body = req.body as UpdateEscalationRuleInput;
    const actorId = req.auth?.userId;
    const updated = await adminAiService.updateEscalationRule(id, body, actorId);
    return ApiResponse.ok(res, updated);
  },

  async deleteEscalationRule(req: Request, res: Response) {
    const id = req.params.id as string;
    const actorId = req.auth?.userId;
    const result = await adminAiService.deleteEscalationRule(id, actorId);
    return ApiResponse.ok(res, result);
  },
};
