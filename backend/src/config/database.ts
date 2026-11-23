import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

/**
 * Single PrismaClient for the process. In dev, tsx reloads the module on every
 * save, so we stash the instance on globalThis to avoid exhausting connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ['warn', 'error'] : ['error'],
  });

if (env.isDev) globalForPrisma.prisma = prisma;

/**
 * Models that belong to exactly one organization.
 * ADD EVERY NEW TENANT MODEL HERE or it will not be auto-scoped.
 */
export const TENANT_MODELS = new Set(['Lead', 'Customer', 'Activity', 'Campaign']);

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

/**
 * Returns a Prisma client that transparently injects `organizationId` into
 * every query touching a tenant model. Repositories use this instead of the
 * bare client so a forgotten `where` clause cannot leak another tenant's data.
 *
 *   const db = tenantClient(req.tenant.organizationId);
 *   await db.lead.findMany();  // -> WHERE organization_id = '...'
 *
 * `findUnique` is rejected on tenant models: a bare id lookup cannot be scoped
 * safely, so use `findFirst({ where: { id } })` instead.
 */
export function tenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }

          const typedArgs = args as Record<string, unknown>;

          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            throw new Error(
              `${operation} is not allowed on tenant model "${model}". Use findFirst({ where: { id } }).`,
            );
          }

          if (operation === 'create' || operation === 'upsert') {
            const data = (typedArgs.data ?? {}) as Record<string, unknown>;
            typedArgs.data = { ...data, organizationId };
            if (operation === 'upsert') {
              const create = (typedArgs.create ?? {}) as Record<string, unknown>;
              const update = (typedArgs.update ?? {}) as Record<string, unknown>;
              typedArgs.create = { ...create, organizationId };
              typedArgs.update = update;
              typedArgs.where = { ...((typedArgs.where as object) ?? {}), organizationId };
              delete typedArgs.data;
            }
            return query(typedArgs);
          }

          if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const data = typedArgs.data;
            typedArgs.data = Array.isArray(data)
              ? data.map((row) => ({ ...(row as object), organizationId }))
              : { ...((data as object) ?? {}), organizationId };
            return query(typedArgs);
          }

          if (operation === 'update' || operation === 'delete' || READ_OPERATIONS.has(operation)) {
            typedArgs.where = { ...((typedArgs.where as object) ?? {}), organizationId };
            return query(typedArgs);
          }

          return query(typedArgs);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof tenantClient>;

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, 'Database connection failed; running in offline/file-based mode');
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
