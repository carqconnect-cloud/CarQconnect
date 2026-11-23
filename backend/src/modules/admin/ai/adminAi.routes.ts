import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { validate } from '../../../common/middleware/validate.middleware';
import { adminAiController } from './adminAi.controller';
import {
  createEscalationRuleSchema,
  createKnowledgeArticleSchema,
  idParamSchema,
  listKnowledgeQuerySchema,
  toolKeyParamSchema,
  updateEscalationRuleSchema,
  updateIntentThresholdSchema,
  updateKnowledgeArticleSchema,
  updateKnowledgeStatusSchema,
  updateToolPermissionsSchema,
} from './adminAi.schema';

export const adminAiRoutes = Router();

// 1. Dashboard & Analytics
adminAiRoutes.get(
  '/analytics',
  asyncHandler(adminAiController.getAnalytics),
);

// 2. Knowledge Base Endpoints
adminAiRoutes.get(
  '/knowledge',
  validate({ query: listKnowledgeQuerySchema }),
  asyncHandler(adminAiController.listKnowledge),
);

adminAiRoutes.get(
  '/knowledge/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminAiController.getKnowledgeById),
);

adminAiRoutes.post(
  '/knowledge',
  validate({ body: createKnowledgeArticleSchema }),
  asyncHandler(adminAiController.createKnowledge),
);

adminAiRoutes.patch(
  '/knowledge/:id',
  validate({ params: idParamSchema, body: updateKnowledgeArticleSchema }),
  asyncHandler(adminAiController.updateKnowledge),
);

adminAiRoutes.patch(
  '/knowledge/:id/status',
  validate({ params: idParamSchema, body: updateKnowledgeStatusSchema }),
  asyncHandler(adminAiController.updateKnowledgeStatus),
);

adminAiRoutes.delete(
  '/knowledge/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminAiController.deleteKnowledge),
);

// 3. Intent Catalog Endpoints (Read-Only Catalog + Threshold Tuning)
adminAiRoutes.get(
  '/intents',
  asyncHandler(adminAiController.listIntents),
);

adminAiRoutes.patch(
  '/intents/:id/threshold',
  validate({ params: idParamSchema, body: updateIntentThresholdSchema }),
  asyncHandler(adminAiController.updateIntentThreshold),
);

// 4. Tool Permissions Endpoints
adminAiRoutes.get(
  '/tools',
  asyncHandler(adminAiController.listTools),
);

adminAiRoutes.patch(
  '/tools/:toolKey/permissions',
  validate({ params: toolKeyParamSchema, body: updateToolPermissionsSchema }),
  asyncHandler(adminAiController.updateToolPermissions),
);

// 5. Escalation Rules Endpoints
adminAiRoutes.get(
  '/escalation-rules',
  asyncHandler(adminAiController.listEscalationRules),
);

adminAiRoutes.post(
  '/escalation-rules',
  validate({ body: createEscalationRuleSchema }),
  asyncHandler(adminAiController.createEscalationRule),
);

adminAiRoutes.patch(
  '/escalation-rules/:id',
  validate({ params: idParamSchema, body: updateEscalationRuleSchema }),
  asyncHandler(adminAiController.updateEscalationRule),
);

adminAiRoutes.delete(
  '/escalation-rules/:id',
  validate({ params: idParamSchema }),
  asyncHandler(adminAiController.deleteEscalationRule),
);
