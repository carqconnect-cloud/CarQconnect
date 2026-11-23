import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { aiChatService } from './aiChat.service';

const AI_BASE_URL = (
  process.env.AI_BASE_URL || `http://127.0.0.1:${process.env.AI_PORT || 8000}/api/v1`
).replace('://localhost:', '://127.0.0.1:');

export const aiChatRouter = Router();

/**
 * POST /api/v1/ai/chat
 * Proxies the chat message to the Python FastAPI AI chatbot,
 * saves the conversation in PostgreSQL, and syncs the summary with CRM customer metadata.
 */
aiChatRouter.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, session_id, user_id } = req.body as {
      message: string;
      session_id: string;
      user_id?: string;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'message is required and must be a non-empty string' });
      return;
    }

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({ error: 'session_id is required' });
      return;
    }

    // Resolve user identification
    let resolvedEmail = req.auth?.email;
    let resolvedUserId = req.auth?.userId;

    if (!resolvedEmail && user_id && user_id.includes('@')) {
      resolvedEmail = user_id.trim();
    } else if (!resolvedUserId && user_id && !user_id.includes('@')) {
      resolvedUserId = user_id.trim();
    }

    // If we only have email or userId, find the other from User or Customer table
    if (resolvedEmail && !resolvedUserId) {
      const user = await prisma.user.findFirst({ where: { email: resolvedEmail }, select: { id: true } });
      if (user) resolvedUserId = user.id;
    } else if (resolvedUserId && !resolvedEmail) {
      const user = await prisma.user.findFirst({ where: { id: resolvedUserId }, select: { email: true } });
      if (user) resolvedEmail = user.email;
    }

    const startTime = Date.now();
    let answer = '';
    let sources: any[] = [];

    // 1. Fetch AI Governance Settings configured by Super-Admin
    const [publishedArticles, activeEscalationRules, toolPermissions, aiIntents] = await Promise.all([
      prisma.aiKnowledgeArticle.findMany({ where: { status: 'published' } }).catch(() => []),
      prisma.aiEscalationRule.findMany({ where: { active: true } }).catch(() => []),
      prisma.aiToolPermission.findMany().catch(() => []),
      prisma.aiIntent.findMany().catch(() => []),
    ]);

    // 2. Evaluate Escalation Rules (e.g. human agent request, accident, refund, fraud)
    const normalizedMessage = message.trim().toLowerCase();
    const triggeredRule = activeEscalationRules.find((rule) => {
      const condition = (rule.condition || '').toLowerCase();
      const keywords = condition
        .replace(/^(keywords:|mentions:|contains:)?/i, '')
        .split(/[,;|]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 2);
      return keywords.some((kw) => normalizedMessage.includes(kw));
    });

    if (triggeredRule) {
      logger.info({ ruleId: triggeredRule.id, condition: triggeredRule.condition }, '[AI Governance] Escalation rule triggered');
      answer = `I understand this matter requires human attention (${triggeredRule.action}). I have routed your query to our senior FIONER support specialist who will review your case and follow up directly.`;
      sources = [{ title: `Escalation Rule: ${triggeredRule.condition}`, category: 'Human Support Hand-off' }];
    } else {
      // 3. Check for high-confidence exact match in Super-Admin Knowledge Base Articles
      const directMatch = publishedArticles.find((art) => {
        const q = (art.question || '').toLowerCase();
        return q === normalizedMessage || (q.length > 8 && normalizedMessage.includes(q));
      });

      if (directMatch && directMatch.answer) {
        answer = directMatch.answer;
        sources = [{ title: directMatch.question, category: directMatch.category, id: directMatch.id }];
      } else {
        // 4. Construct Super-Admin Governance Context
        let governanceContext = '\n\nOFFICIAL SUPER-ADMIN KNOWLEDGE BASE ARTICLES:\n';
        for (const art of publishedArticles) {
          governanceContext += `Q: ${art.question}\nA: ${art.answer} (Category: ${art.category})\n\n`;
        }

        const disabledTools = toolPermissions.filter((t) => !t.read || !t.write);
        if (disabledTools.length > 0) {
          governanceContext += `\nRESTRICTED TOOLS (ADMIN POLICY STRICTLY FORBIDS THESE ACTIONS):\n`;
          for (const dt of disabledTools) {
            governanceContext += `- Tool "${dt.name}" (${dt.toolKey}): Disabled by Super Admin. Do not execute or expose data for this action.\n`;
          }
        }

        if (aiIntents.length > 0) {
          governanceContext += `\nSUPPORTED DOMAIN INTENTS:\n`;
          for (const it of aiIntents) {
            governanceContext += `- Intent "${it.name}" (Target Tool: ${it.tool}, Confidence Threshold: ${it.threshold})\n`;
          }
        }

        try {
          const aiResponse = await fetch(`${AI_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message.trim(),
              session_id,
              user_id: resolvedEmail || resolvedUserId || user_id,
              governance_context: governanceContext,
            }),
          });

          if (aiResponse.ok) {
            const data = (await aiResponse.json()) as { answer?: string; session_id?: string; source_documents?: any[] };
            answer = data.answer || '';
            sources = data.source_documents || [];
          } else {
            throw new Error(`AI service returned ${aiResponse.status}`);
          }
        } catch (err: unknown) {
          logger.warn({ err }, 'Python AI service unavailable at %s, falling back to direct Gemini AI with governance', AI_BASE_URL);
          answer = await callDirectGemini(message.trim(), governanceContext);
        }
      }
    }

    if (!answer) {
      answer = 'Hello! I am your FIONER CarQ AI Assistant. I can assist you with your Smart QR Tag, vehicle documents, digital garage, FASTag, reminders, and trip tracking.';
    }

    // Pacing: ensure reply takes 3 seconds for natural conversational flow
    const elapsed = Date.now() - startTime;
    if (elapsed < 3000) {
      await new Promise((r) => setTimeout(r, 3000 - elapsed));
    }

    // Asynchronously persist conversation to DB and sync to Customer metadata for CRM
    void aiChatService.saveConversation({
      sessionId: session_id,
      userId: resolvedUserId,
      userEmail: resolvedEmail,
      userMessage: message.trim(),
      aiResponse: answer,
      metadata: {
        sourceDocuments: sources,
        origin: req.headers.origin || '',
      },
    });

    res.json({
      answer,
      session_id,
      source_documents: sources,
    });
  }),
);

async function callDirectGemini(query: string, governanceContext: string = ''): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const systemInstruction = `You are the official AI Assistant for FIONER / CarQ Connect.
CarQ Connect is a smart connected vehicle ecosystem offering:
- Smart QR Tags for vehicle safety & privacy (contactless masked calling/messaging without exposing private phone numbers).
- Digital Garage (manage multiple cars/bikes, vehicle specifications, RC, pollution, insurance).
- Document Vault (store RC, PUC, Driving License, Insurance with expiry notifications).
- FASTag Services & Toll tracking.
- Trip Log & GPS Tracking (live vehicle location, speed alerts, trip history, geofencing).
- Emergency SOS & 24/7 Helpline.
Provide helpful, professional, and friendly answers to user vehicle queries. Keep responses concise and formatted nicely.

${governanceContext}
STRICT COMPLIANCE INSTRUCTION:
Adhere strictly to official knowledge base articles above. Never provide answers that violate disabled tool permissions or platform policies.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser Question: ${query}` }],
            },
          ],
        }),
      }
    );
    if (!res.ok) return '';
    const data = (await res.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '';
  } catch (e) {
    logger.error({ e }, 'Direct Gemini fallback call failed');
    return '';
  }
}

/**
 * GET /api/v1/ai/chats
 * Fetches saved conversations for a user by email or userId
 */
aiChatRouter.get(
  '/chats',
  asyncHandler(async (req: Request, res: Response) => {
    const email = (req.query.email as string) || req.auth?.email;
    const userId = (req.query.userId as string) || req.auth?.userId;

    const chats = await aiChatService.getCustomerConversations(email, userId);
    res.json({ success: true, data: chats });
  }),
);

/**
 * DELETE /api/v1/ai/chats/:sessionId
 * Deletes a conversation by sessionId
 */
aiChatRouter.delete(
  '/chats/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }
    await aiChatService.deleteConversation(sessionId);
    res.json({ success: true, message: 'Conversation deleted' });
  }),
);



