/* eslint-disable no-console */
/**
 * Scaffolds a new module so both developers produce identical file shapes.
 *
 *   npm run gen:module -- products
 *   npm run gen:module -- crm/customers --tenant
 *
 * --tenant (default true) wires the repository through tenantClient().
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith('--'));
if (!target) {
  console.error('Usage: npm run gen:module -- <name>   e.g. npm run gen:module -- products');
  process.exit(1);
}

const isTenant = !args.includes('--no-tenant');
const segments = target.split('/').filter(Boolean);
const folder = path.join('src', 'modules', ...segments);
const raw = segments[segments.length - 1] as string;
const singular = raw.endsWith('s') ? raw.slice(0, -1) : raw;
const Pascal = singular.charAt(0).toUpperCase() + singular.slice(1);
const depth = '../'.repeat(segments.length + 1);

if (fs.existsSync(folder)) {
  console.error(`Module already exists: ${folder}`);
  process.exit(1);
}
fs.mkdirSync(folder, { recursive: true });

const files: Record<string, string> = {
  [`${singular}.schema.ts`]: `import { z } from 'zod';
import { paginationSchema } from '${depth}common/validators/common.schema';

export const list${Pascal}sSchema = paginationSchema.extend({});

export const create${Pascal}Schema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const update${Pascal}Schema = create${Pascal}Schema.partial();

export type List${Pascal}sInput = z.infer<typeof list${Pascal}sSchema>;
export type Create${Pascal}Input = z.infer<typeof create${Pascal}Schema>;
export type Update${Pascal}Input = z.infer<typeof update${Pascal}Schema>;
`,

  [`${singular}.repository.ts`]: isTenant
    ? `import { tenantClient } from '${depth}config/database';

export function ${singular}Repository(organizationId: string) {
  const db = tenantClient(organizationId);

  return {
    async list(args: { skip: number; take: number; orderBy: Record<string, 'asc' | 'desc'> }) {
      const [items, total] = await Promise.all([
        db.${singular}.findMany({ skip: args.skip, take: args.take, orderBy: args.orderBy }),
        db.${singular}.count(),
      ]);
      return { items, total };
    },
    findById(id: string) {
      return db.${singular}.findFirst({ where: { id } });
    },
  };
}
`
    : `import { prisma } from '${depth}config/database';

export const ${singular}Repository = {
  findById(id: string) {
    return prisma.${singular}.findUnique({ where: { id } });
  },
};
`,

  [`${singular}.service.ts`]: `import { ApiError } from '${depth}common/utils/apiError';
import { buildPaginationMeta, getPaginationArgs, getSortArgs } from '${depth}common/utils/pagination';
import { ${singular}Repository } from './${singular}.repository';
import type { List${Pascal}sInput } from './${singular}.schema';

const SORTABLE = ['createdAt'] as const;

export const ${singular}Service = {
  async list(organizationId: string, query: List${Pascal}sInput) {
    const pagination = getPaginationArgs(query);
    const { items, total } = await ${singular}Repository(organizationId).list({
      skip: pagination.skip,
      take: pagination.take,
      orderBy: getSortArgs(query, SORTABLE, 'createdAt'),
    });
    return { items, meta: buildPaginationMeta(total, pagination) };
  },

  async getById(organizationId: string, id: string) {
    const found = await ${singular}Repository(organizationId).findById(id);
    if (!found) throw ApiError.notFound('${Pascal}');
    return found;
  },
};
`,

  [`${singular}.controller.ts`]: `import type { Request, Response } from 'express';
import { ApiError } from '${depth}common/utils/apiError';
import { ApiResponse } from '${depth}common/utils/apiResponse';
import { ${singular}Service } from './${singular}.service';
import type { List${Pascal}sInput } from './${singular}.schema';

function orgOf(req: Request): string {
  if (!req.tenant) throw ApiError.forbidden('Organization context required');
  return req.tenant.organizationId;
}

export const ${singular}Controller = {
  async list(req: Request, res: Response) {
    const { items, meta } = await ${singular}Service.list(orgOf(req), req.query as unknown as List${Pascal}sInput);
    return ApiResponse.ok(res, items, meta);
  },

  async get(req: Request, res: Response) {
    return ApiResponse.ok(res, await ${singular}Service.getById(orgOf(req), req.params.id as string));
  },
};
`,

  [`${singular}.routes.ts`]: `import { Router } from 'express';
import { validate } from '${depth}common/middleware/validate.middleware';
import { asyncHandler } from '${depth}common/utils/asyncHandler';
import { idParamSchema } from '${depth}common/validators/common.schema';
import { ${singular}Controller } from './${singular}.controller';
import { list${Pascal}sSchema } from './${singular}.schema';

export const ${singular}Router = Router();

${singular}Router.get('/', validate({ query: list${Pascal}sSchema }), asyncHandler(${singular}Controller.list));
${singular}Router.get('/:id', validate({ params: idParamSchema }), asyncHandler(${singular}Controller.get));
`,
};

for (const [name, contents] of Object.entries(files)) {
  fs.writeFileSync(path.join(folder, name), contents);
}

console.log(`Created ${folder}:`);
Object.keys(files).forEach((name) => console.log(`  - ${name}`));
console.log(`
Next:
  1. Add the "${Pascal}" model to prisma/schema/ and run: npm run prisma:migrate`);
if (isTenant) console.log(`  2. Register "${Pascal}" in TENANT_MODELS (src/config/database.ts)`);
console.log(`  3. Mount the router in src/routes/index.ts`);
