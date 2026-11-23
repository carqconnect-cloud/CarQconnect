import path from 'node:path';
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma reads this file instead of the `prisma` block in package.json.
 * `schema` points at a FOLDER, so each domain gets its own .prisma file.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
