import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';

export interface PlatformRole {
  id: string;
  name: string;
  desc: string;
  perms: 'all' | Record<string, string[]>;
  version?: number;
  updatedAt?: string;
}

export const CANONICAL_ROLE_IDS = ['role_1'] as const;

export const CANONICAL_ROLES: PlatformRole[] = [
  {
    id: 'role_1',
    name: 'Super Admin',
    desc: 'Full unrestricted control of the platform.',
    perms: 'all',
  },
];

export function resolveBootstrapFilePath(): string | null {
  const candidates = [
    path.resolve(__dirname, '../../../../data/platform-roles.json'),
    path.resolve(__dirname, '../../../data/platform-roles.json'),
    path.resolve(process.cwd(), 'data/platform-roles.json'),
    path.resolve(process.cwd(), 'backend/data/platform-roles.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

export function validateAndParseBootstrapRoles(rawContent: string): PlatformRole[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    throw new Error(`Authoritative role bootstrap failed: malformed JSON (${err.message})`);
  }

  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error(
      `Authoritative role bootstrap failed: expected exactly 1 canonical role, received ${Array.isArray(parsed) ? parsed.length : typeof parsed}`,
    );
  }

  const roleMap = new Map<string, any>();
  for (const r of parsed) {
    if (!r || typeof r !== 'object' || !r.id || typeof r.id !== 'string') {
      throw new Error('Authoritative role bootstrap failed: role record missing valid id');
    }
    roleMap.set(r.id, r);
  }

  for (const expectedId of CANONICAL_ROLE_IDS) {
    if (!roleMap.has(expectedId)) {
      throw new Error(`Authoritative role bootstrap failed: missing expected role '${expectedId}'`);
    }
  }

  const validated: PlatformRole[] = [];

  // 1. Super Admin role invariant
  const r1 = roleMap.get('role_1');
  if (r1.perms !== 'all') {
    throw new Error("Authoritative role bootstrap failed: role_1 must preserve perms: 'all'");
  }
  validated.push({
    id: 'role_1',
    name: String(r1.name || 'Super Admin'),
    desc: String(r1.desc || 'Full unrestricted control of the platform.'),
    perms: 'all',
    updatedAt: r1.updatedAt,
  });

  return validated;
}

export function loadBootstrapRoles(): PlatformRole[] {
  const filePath = resolveBootstrapFilePath();
  if (!filePath) {
    throw new Error(
      'Authoritative role bootstrap failed: platform-roles.json file not found in recognized data directories.',
    );
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return validateAndParseBootstrapRoles(content);
}

function mapDbRole(r: any): PlatformRole {
  return {
    id: r.id,
    name: r.name,
    desc: r.desc,
    perms: r.perms,
    version: r.version,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

let isInitialized = false;
const PLATFORM_ROLES_BOOTSTRAP_LOCK_ID = 829471928;

export const adminRoleRepository = {
  resetInitializationFlag(): void {
    isInitialized = false;
  },

  async ensureInitialized(db: any = prisma): Promise<void> {
    if (isInitialized) return;

    // Check existing role state in database
    const existingRoles = await db.platformRole.findMany({
      select: { id: true },
    });
    const count = existingRoles.length;

    // Policy 1: Complete and valid database state
    if (count === 1) {
      const existingIds = new Set(existingRoles.map((r: any) => r.id));
      const hasAll = CANONICAL_ROLE_IDS.every((id) => existingIds.has(id));
      if (hasAll) {
        isInitialized = true;
        return;
      }
      throw new Error(
        `Authoritative role persistence error: database contains inconsistent role IDs (${Array.from(existingIds).join(', ')}). Automatic repair is prohibited to prevent data loss. Manual reconciliation required.`,
      );
    }

    // Policy 2: Incomplete or corrupted database state (!= 1 role)
    // Fail closed! Do NOT insert, update, or delete any role as an automatic repair.
    if (count > 0) {
      const existingIds = existingRoles.map((r: any) => r.id).join(', ');
      throw new Error(
        `Authoritative role persistence error: database contains an incomplete or inconsistent role set (${count} roles found: ${existingIds}). Automatic repair is prohibited to prevent data loss. Manual reconciliation required.`,
      );
    }

    // Policy 3: Completely empty table (count === 0).
    // Validate entire bootstrap JSON and initialize the canonical role atomically.
    const rolesToBootstrap = loadBootstrapRoles();

    await db.$transaction(async (tx: any) => {
      // PostgreSQL transactional advisory lock to prevent concurrent initialization races
      if (typeof tx.$executeRawUnsafe === 'function') {
        try {
          await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', PLATFORM_ROLES_BOOTSTRAP_LOCK_ID);
        } catch (_) {
          // If advisory lock is unsupported (e.g. test double), proceed within transaction
        }
      }

      // Re-check count inside isolated lock
      const innerRoles = await tx.platformRole.findMany({
        select: { id: true },
      });
      const innerCount = innerRoles.length;

      if (innerCount === 1) {
        const innerIds = new Set(innerRoles.map((r: any) => r.id));
        if (CANONICAL_ROLE_IDS.every((id) => innerIds.has(id))) {
          return;
        }
        throw new Error(
          'Authoritative role persistence error: competing initialization produced inconsistent role set.',
        );
      }

      if (innerCount > 0) {
        throw new Error(
          `Authoritative role persistence error: database contains an incomplete or inconsistent role set (${innerCount} roles found). Automatic repair is prohibited.`,
        );
      }

      for (const role of rolesToBootstrap) {
        await tx.platformRole.create({
          data: {
            id: role.id,
            name: role.name,
            desc: role.desc,
            perms: role.perms as any,
            version: 1,
            ...(role.updatedAt ? { updatedAt: new Date(role.updatedAt) } : {}),
          },
        });
      }
    });

    isInitialized = true;
  },

  async getAll(db: any = prisma): Promise<PlatformRole[]> {
    await this.ensureInitialized(db);
    const rows = await db.platformRole.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map(mapDbRole);
  },

  async getById(id: string, db: any = prisma): Promise<PlatformRole | undefined> {
    await this.ensureInitialized(db);
    const row = await db.platformRole.findUnique({
      where: { id },
    });
    if (!row) return undefined;
    return mapDbRole(row);
  },

  async updateRoleAtomic(
    roleId: string,
    mutator: (currentPerms: Record<string, string[]>) => Record<string, string[]>,
    afterUpdateInTx?: (updatedRole: PlatformRole, tx: any) => Promise<void>,
    db: any = prisma,
  ): Promise<PlatformRole> {
    await this.ensureInitialized(db);

    return db.$transaction(async (tx: any) => {
      // 1. In PostgreSQL, acquire exclusive row lock with SELECT ... FOR UPDATE
      let role: any = null;
      if (typeof tx.$queryRawUnsafe === 'function') {
        try {
          const rows = await tx.$queryRawUnsafe(
            'SELECT id, name, "desc", perms, version, "updatedAt" FROM platform_roles WHERE id = $1 FOR UPDATE',
            roleId,
          );
          if (Array.isArray(rows) && rows.length > 0) {
            role = rows[0];
            if (typeof role.perms === 'string') {
              try {
                role.perms = JSON.parse(role.perms);
              } catch (_) {}
            }
          }
        } catch (_) {
          // Fallback if raw query is not implemented on mock
        }
      }

      if (!role) {
        role = await tx.platformRole.findUnique({
          where: { id: roleId },
        });
      }

      if (!role) {
        throw ApiError.notFound(`Role '${roleId}'`);
      }

      if (role.id === 'role_1' || role.name === 'Super Admin' || role.perms === 'all') {
        throw ApiError.badRequest('Super Admin permissions are immutable and cannot be modified.');
      }

      const currentPerms: Record<string, string[]> =
        typeof role.perms === 'object' && role.perms !== null ? { ...(role.perms as any) } : {};

      const nextPerms = mutator(currentPerms);
      const expectedVersion = role.version ?? 1;

      // 2. Conditional optimistic concurrency update checking expected version
      const updateResult = await tx.platformRole.updateMany({
        where: {
          id: roleId,
          version: expectedVersion,
        },
        data: {
          perms: nextPerms as any,
          version: expectedVersion + 1,
        },
      });

      if (updateResult.count === 0) {
        throw ApiError.conflict(
          `Concurrent update conflict on role '${roleId}'. The role was modified by another operation.`,
        );
      }

      const updated = await tx.platformRole.findUnique({
        where: { id: roleId },
      });

      const mappedRole = mapDbRole(updated);

      // 3. Execute post-update callback (such as audit logging) inside the SAME transaction
      if (afterUpdateInTx) {
        await afterUpdateInTx(mappedRole, tx);
      }

      return mappedRole;
    });
  },

  async resetToDefaults(db: any = prisma): Promise<PlatformRole[]> {
    isInitialized = false;
    await db.platformRole.deleteMany();
    await this.ensureInitialized(db);
    return this.getAll(db);
  },
};
