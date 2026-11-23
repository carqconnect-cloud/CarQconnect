import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

export function generateChatSummary(userMessage: string, _aiResponse: string): string {
  const msg = userMessage.trim();
  const lower = msg.toLowerCase();

  if (lower.includes('fastag') || lower.includes('toll')) {
    return 'FASTag recharge & balance inquiry';
  }
  if (lower.includes('insurance') || lower.includes('policy')) {
    return 'Insurance policy & renewal query';
  }
  if (
    lower.includes('rc') ||
    lower.includes('registration') ||
    lower.includes('puc') ||
    lower.includes('document')
  ) {
    return 'Vehicle documents & RC query';
  }
  if (
    lower.includes('service') ||
    lower.includes('maintenance') ||
    lower.includes('oil') ||
    lower.includes('mechanic')
  ) {
    return 'Service & vehicle maintenance query';
  }
  if (
    lower.includes('trip') ||
    lower.includes('route') ||
    lower.includes('travel') ||
    lower.includes('drive')
  ) {
    return 'Trip planning & travel route query';
  }
  if (
    lower.includes('sos') ||
    lower.includes('emergency') ||
    lower.includes('accident') ||
    lower.includes('help')
  ) {
    return 'Emergency SOS & safety inquiry';
  }
  if (lower.includes('tag') || lower.includes('qr') || lower.includes('contact')) {
    return 'Smart QR tag & contact inquiry';
  }
  if (lower.includes('challan') || lower.includes('fine')) {
    return 'Traffic e-challan inquiry';
  }

  // Clean prompt for concise title (up to 55 chars)
  const clean = msg.replace(
    /^(can you|please|tell me|how do i|how to|what is|how can i)\s+/i,
    ''
  );
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  if (capitalized.length > 55) {
    return capitalized.substring(0, 52) + '...';
  }
  return capitalized || 'General Assistant Query';
}

export interface SaveAiChatParams {
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  userMessage: string;
  aiResponse: string;
  metadata?: Record<string, unknown>;
}

export const aiChatService = {
  async saveConversation(params: SaveAiChatParams) {
    try {
      const now = new Date();
      const newMessages = [
        { role: 'user', content: params.userMessage, timestamp: now.toISOString() },
        { role: 'assistant', content: params.aiResponse, timestamp: now.toISOString() },
      ];

      // 1. Check if conversation thread already exists for this sessionId
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ai_chat_conversations" WHERE "sessionId" = $1 LIMIT 1;`,
        params.sessionId
      );

      let convId: string;
      let summary: string;

      if (existing && existing.length > 0) {
        const row = existing[0];
        convId = row.id;

        // Append to existing messages array
        let currentMessages: any[] = [];
        try {
          if (Array.isArray(row.messages)) {
            currentMessages = row.messages;
          } else if (typeof row.messages === 'string') {
            currentMessages = JSON.parse(row.messages);
          }
        } catch (_) {
          currentMessages = [];
        }

        // If messages array was empty, but row has userMessage/aiResponse, preserve them
        if (currentMessages.length === 0 && row.userMessage && row.aiResponse) {
          currentMessages = [
            { role: 'user', content: row.userMessage, timestamp: row.createdAt || now.toISOString() },
            { role: 'assistant', content: row.aiResponse, timestamp: row.createdAt || now.toISOString() },
          ];
        }

        const mergedMessages = [...currentMessages, ...newMessages];

        // Keep or refine summary
        summary = row.summary && row.summary !== 'General Assistant Query'
          ? row.summary
          : generateChatSummary(params.userMessage, params.aiResponse);

        await prisma.$executeRawUnsafe(
          `UPDATE "ai_chat_conversations" 
           SET "messages" = $1::jsonb,
               "sessionId" = $2,
               "userMessage" = $3,
               "aiResponse" = $4,
               "summary" = $5,
               "updatedAt" = $6,
               "userEmail" = COALESCE($7, "userEmail"),
               "userId" = COALESCE($8, "userId")
           WHERE "id" = $9;`,
          JSON.stringify(mergedMessages),
          params.sessionId,
          params.userMessage,
          params.aiResponse,
          summary,
          now,
          params.userEmail || null,
          params.userId || null,
          convId
        );
      } else {
        convId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        summary = generateChatSummary(params.userMessage, params.aiResponse);

        await prisma.$executeRawUnsafe(
          `INSERT INTO "ai_chat_conversations" 
            ("id", "sessionId", "userId", "userEmail", "userMessage", "aiResponse", "summary", "messages", "metadata", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11);`,
          convId,
          params.sessionId,
          params.userId || null,
          params.userEmail || null,
          params.userMessage,
          params.aiResponse,
          summary,
          JSON.stringify(newMessages),
          JSON.stringify(params.metadata || {}),
          now,
          now
        );
      }

      // 2. Sync updated full conversation thread to Customer metadata for CRM view
      if (params.userEmail || params.userId) {
        await this.syncCustomerChats(params.userEmail || undefined, params.userId || undefined);
      }

      return { id: convId, summary, updatedAt: now };
    } catch (error) {
      logger.error({ error, params }, 'Failed to save AI chat conversation');
      return null;
    }
  },

  async getCustomerConversations(email?: string, userId?: string) {
    try {
      if (email || userId) {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "ai_chat_conversations" 
           WHERE ($1::text IS NOT NULL AND "userEmail" = $1)
              OR ($2::text IS NOT NULL AND "userId" = $2)
           ORDER BY "updatedAt" DESC
           LIMIT 50;`,
          email || null,
          userId || null
        );
        return rows;
      }
      // If neither is provided, return all recent conversations
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "ai_chat_conversations" 
         ORDER BY "updatedAt" DESC
         LIMIT 50;`
      );
      return rows;
    } catch (err) {
      logger.error({ err, email, userId }, 'Failed to get customer AI conversations');
      return [];
    }
  },

  async deleteConversation(sessionId: string) {
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "ai_chat_conversations" WHERE "sessionId" = $1 OR "id" = $1;`,
        sessionId
      );
      return true;
    } catch (err) {
      logger.error({ err, sessionId }, 'Failed to delete AI conversation');
      return false;
    }
  },

  async syncCustomerChats(userEmail?: string, userId?: string) {
    if (!userEmail && !userId) return;

    try {
      // Find matching customers in CRM
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            ...(userEmail ? [{ email: userEmail }] : []),
            ...(userId ? [{ id: userId }] : []),
          ],
        },
      });

      if (!customers || customers.length === 0) return;

      // Get latest conversations from PostgreSQL
      const convs = await this.getCustomerConversations(userEmail, userId);

      const formattedChats = convs.map((c) => {
        let msgList: any[] = [];
        try {
          if (Array.isArray(c.messages)) {
            msgList = c.messages;
          } else if (typeof c.messages === 'string') {
            msgList = JSON.parse(c.messages);
          }
        } catch (_) {
          msgList = [];
        }

        if (msgList.length === 0) {
          msgList = [
            { role: 'user', content: c.userMessage, timestamp: c.createdAt },
            { role: 'assistant', content: c.aiResponse, timestamp: c.createdAt },
          ];
        }

        return {
          id: c.id,
          sessionId: c.sessionId,
          summary: c.summary || generateChatSummary(c.userMessage, c.aiResponse),
          messages: msgList,
          instruction: `User: ${c.userMessage}\nAI: ${c.aiResponse}`,
          userMessage: c.userMessage,
          aiResponse: c.aiResponse,
          messageCount: msgList.length,
          date: new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          timestamp: c.updatedAt || c.createdAt,
        };
      });

      // Update metadata on all matching Customer records
      for (const customer of customers) {
        const meta = (customer.metadata as Record<string, any>) || {};
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            metadata: {
              ...meta,
              chats: formattedChats,
            },
          },
        });
      }
    } catch (error) {
      logger.error({ error, userEmail, userId }, 'Failed to sync chats to customer metadata');
    }
  },
};
