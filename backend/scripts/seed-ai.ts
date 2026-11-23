import { prisma } from '../src/config/database';

export const APPROVED_INTENTS = [
  { name: 'trip.plan', tool: 'trip_planner', threshold: 0.82 },
  { name: 'toll.estimate', tool: 'toll_estimator', threshold: 0.78 },
  { name: 'order.status', tool: 'order_lookup', threshold: 0.85 },
  { name: 'membership.status', tool: 'membership_lookup', threshold: 0.83 },
  { name: 'gps.status', tool: 'gps_status_lookup', threshold: 0.84 },
  { name: 'support.ticket.create', tool: 'ticket_creator', threshold: 0.70 },
  { name: 'fastag.recharge', tool: 'fastag_recharge', threshold: 0.88 },
  { name: 'fuel.estimate', tool: 'unmapped', threshold: 0.80 },
  { name: 'poi.search', tool: 'unmapped', threshold: 0.75 },
  { name: 'faq.lookup', tool: 'unmapped', threshold: 0.65 },
] as const;

export const APPROVED_TOOLS = [
  { toolKey: 'trip_planner', name: 'Trip Planner', read: false, write: false },
  { toolKey: 'toll_estimator', name: 'Toll Estimator', read: false, write: false },
  { toolKey: 'order_lookup', name: 'Order Lookup', read: false, write: false },
  { toolKey: 'membership_lookup', name: 'Membership Lookup', read: false, write: false },
  { toolKey: 'gps_status_lookup', name: 'GPS Status Lookup', read: false, write: false },
  { toolKey: 'ticket_creator', name: 'Ticket Creator', read: false, write: false },
  { toolKey: 'fastag_recharge', name: 'FASTag Recharge', read: false, write: false },
  { toolKey: 'payment_refund', name: 'Payment Refund', read: false, write: false },
] as const;

export async function seedAiCatalog(customPrisma = prisma) {
  // eslint-disable-next-line no-console
  console.log('[seedAiCatalog] Seeding approved AI catalog idempotently...');

  // 1. Seed 10 intents using upsert with empty update to preserve custom thresholds
  for (const intent of APPROVED_INTENTS) {
    await customPrisma.aiIntent.upsert({
      where: { name: intent.name },
      update: {}, // preserve any custom threshold already set in DB
      create: {
        name: intent.name,
        tool: intent.tool,
        threshold: intent.threshold,
      },
    });
  }

  // 2. Seed 8 tools using upsert with empty update to preserve custom permissions
  for (const tool of APPROVED_TOOLS) {
    await customPrisma.aiToolPermission.upsert({
      where: { toolKey: tool.toolKey },
      update: {}, // preserve any custom permissions already set in DB
      create: {
        toolKey: tool.toolKey,
        name: tool.name,
        read: tool.read,
        write: tool.write,
      },
    });
  }

  const [intentCount, toolCount] = await Promise.all([
    customPrisma.aiIntent.count(),
    customPrisma.aiToolPermission.count(),
  ]);

  // eslint-disable-next-line no-console
  console.log(`[seedAiCatalog] Completed. Total intents: ${intentCount}, Total tools: ${toolCount}.`);
  return { intentCount, toolCount };
}

// Allow direct CLI execution: npx tsx scripts/seed-ai.ts
if (require.main === module) {
  seedAiCatalog()
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[seedAiCatalog] Failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
