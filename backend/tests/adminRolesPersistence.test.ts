import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  adminRoleRepository,
  loadBootstrapRoles,
  validateAndParseBootstrapRoles,
} from '../src/modules/admin/roles/adminRole.repository';

describe('Platform Roles Authoritative Persistence & Concurrency Unit Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminRoleRepository.resetInitializationFlag();
  });

  describe('1. Fail-closed bootstrap parser & validator', () => {
    it('successfully loads and validates real backend/data/platform-roles.json preserving role_1 Super Admin perms: all', () => {
      const roles = loadBootstrapRoles();
      expect(roles).toHaveLength(1);

      const r1 = roles.find((r) => r.id === 'role_1');
      expect(r1).toBeDefined();
      expect(r1?.perms).toBe('all');
      expect(r1?.name).toBe('Super Admin');
    });

    it('fails closed when JSON content is malformed', () => {
      expect(() => validateAndParseBootstrapRoles('invalid-json{')).toThrow(
        /Authoritative role bootstrap failed: malformed JSON/i,
      );
    });

    it('fails closed when role count is not exactly 1', () => {
      const json = JSON.stringify([
        { id: 'role_1', name: 'Super Admin', perms: 'all' },
        { id: 'role_2', name: 'Ops', perms: {} },
      ]);
      expect(() => validateAndParseBootstrapRoles(json)).toThrow(
        /expected exactly 1 canonical role/i,
      );
    });

    it('fails closed when role_1 does not have perms: all', () => {
      const roles = loadBootstrapRoles();
      (roles[0] as any).perms = { Users: ['view'] };
      expect(() => validateAndParseBootstrapRoles(JSON.stringify(roles))).toThrow(
        /role_1 must preserve perms: 'all'/i,
      );
    });
  });

  describe('2. Authoritative Database Bootstrap & Partial-State Policy', () => {
    function createMockPrisma(initialDbRoles: any[] = []) {
      const dbStore = new Map<string, any>();
      for (const r of initialDbRoles) {
        dbStore.set(r.id, JSON.parse(JSON.stringify(r)));
      }

      let txQueue = Promise.resolve();

      const mockDb: any = {
        platformRole: {
          count: vi.fn(async () => dbStore.size),
          findMany: vi.fn(async ({ select }: any = {}) => {
            const list = Array.from(dbStore.values()).sort((a, b) => a.id.localeCompare(b.id));
            if (select?.id) {
              return list.map((item) => ({ id: item.id }));
            }
            return list.map((item) => JSON.parse(JSON.stringify(item)));
          }),
          findUnique: vi.fn(async ({ where }: any) => {
            const item = dbStore.get(where.id);
            return item ? JSON.parse(JSON.stringify(item)) : null;
          }),
          create: vi.fn(async ({ data }: any) => {
            if (dbStore.has(data.id)) {
              throw new Error(`Unique constraint failed on id: ${data.id}`);
            }
            const record = {
              ...data,
              version: data.version || 1,
              createdAt: data.createdAt || new Date(),
              updatedAt: data.updatedAt || new Date(),
            };
            dbStore.set(data.id, record);
            return JSON.parse(JSON.stringify(record));
          }),
          updateMany: vi.fn(async ({ where, data }: any) => {
            const item = dbStore.get(where.id);
            if (!item || (where.version !== undefined && item.version !== where.version)) {
              return { count: 0 };
            }
            const updated = {
              ...item,
              perms: data.perms,
              version: data.version || (item.version || 1) + 1,
              updatedAt: new Date(),
            };
            dbStore.set(where.id, updated);
            return { count: 1 };
          }),
          deleteMany: vi.fn(async () => {
            const count = dbStore.size;
            dbStore.clear();
            return { count };
          }),
        },
        $executeRawUnsafe: vi.fn(async () => 1),
        $queryRawUnsafe: vi.fn(async (sql: string, id: string) => {
          if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
            const item = dbStore.get(id);
            return item ? [JSON.parse(JSON.stringify(item))] : [];
          }
          return [];
        }),
        $transaction: vi.fn(async (cb: any) => {
          const prev = txQueue;
          let release: () => void;
          txQueue = new Promise<void>((resolve) => {
            release = resolve;
          });
          await prev;
          try {
            return await cb(mockDb);
          } finally {
            release!();
          }
        }),
      };

      return { mockDb, dbStore };
    }

    it('Policy A: initializes completely empty database table from bootstrap file', async () => {
      const { mockDb, dbStore } = createMockPrisma([]);

      await adminRoleRepository.ensureInitialized(mockDb);

      expect(dbStore.size).toBe(1);
      const r1 = dbStore.get('role_1');
      expect(r1.perms).toBe('all');
      expect(r1.name).toBe('Super Admin');
    });

    it('Policy B: reads existing complete database as authoritative and never overwrites from JSON', async () => {
      const existingDbRoles = [
        { id: 'role_1', name: 'Super Admin Custom', desc: 'Customized in DB', perms: 'all', version: 3 },
      ];

      const { mockDb, dbStore } = createMockPrisma(existingDbRoles);

      await adminRoleRepository.ensureInitialized(mockDb);

      expect(dbStore.get('role_1').name).toBe('Super Admin Custom');
      expect(dbStore.get('role_1').version).toBe(3);
      expect(mockDb.platformRole.create).not.toHaveBeenCalled();
    });

    it('Policy C: FAILS CLOSED when database contains invalid role count (> 1) and leaves existing rows untouched', async () => {
      const corruptRoles = [
        { id: 'role_1', name: 'Super Admin', desc: 'Control', perms: 'all', version: 1 },
        { id: 'role_2', name: 'Removed Role', desc: 'Should not exist', perms: {}, version: 1 },
      ];

      const { mockDb, dbStore } = createMockPrisma(corruptRoles);
      const snapshotBefore = JSON.stringify(Array.from(dbStore.entries()));

      await expect(adminRoleRepository.ensureInitialized(mockDb)).rejects.toThrow(
        /database contains an incomplete or inconsistent role set \(2 roles found/i,
      );

      const snapshotAfter = JSON.stringify(Array.from(dbStore.entries()));
      expect(snapshotAfter).toBe(snapshotBefore);
      expect(dbStore.size).toBe(2);
      expect(mockDb.platformRole.create).not.toHaveBeenCalled();
    });

    it('Policy D: FAILS CLOSED when database contains 1 role but inconsistent ID', async () => {
      const corruptRoles = [
        { id: 'role_corrupted_xyz', name: 'Bad', desc: 'Corrupt', perms: 'all', version: 1 },
      ];

      const { mockDb, dbStore } = createMockPrisma(corruptRoles);
      const snapshotBefore = JSON.stringify(Array.from(dbStore.entries()));

      await expect(adminRoleRepository.ensureInitialized(mockDb)).rejects.toThrow(
        /database contains inconsistent role IDs/i,
      );

      expect(JSON.stringify(Array.from(dbStore.entries()))).toBe(snapshotBefore);
    });

    it('concurrent startup initializers synchronize safely via transaction lock without duplicate inserts', async () => {
      const { mockDb, dbStore } = createMockPrisma([]);

      await Promise.all([
        adminRoleRepository.ensureInitialized(mockDb),
        adminRoleRepository.ensureInitialized(mockDb),
        adminRoleRepository.ensureInitialized(mockDb),
      ]);

      expect(dbStore.size).toBe(1);
      expect(mockDb.platformRole.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Concurrency-Safe Atomic Updates & Optimistic Conflict Detection', () => {
    function createMockPrismaWithRoles() {
      const dbStore = new Map<string, any>();
      const initialRoles = loadBootstrapRoles();
      for (const r of initialRoles) {
        dbStore.set(r.id, {
          id: r.id,
          name: r.name,
          desc: r.desc,
          perms: r.perms === 'all' ? 'all' : JSON.parse(JSON.stringify(r.perms)),
          version: 1,
          updatedAt: new Date(),
        });
      }

      let txQueue = Promise.resolve();

      const mockDb: any = {
        platformRole: {
          count: vi.fn(async () => dbStore.size),
          findMany: vi.fn(async ({ select }: any = {}) => {
            const list = Array.from(dbStore.values()).sort((a, b) => a.id.localeCompare(b.id));
            if (select?.id) return list.map((i) => ({ id: i.id }));
            return list.map((i) => JSON.parse(JSON.stringify(i)));
          }),
          findUnique: vi.fn(async ({ where }: any) => {
            const item = dbStore.get(where.id);
            return item ? JSON.parse(JSON.stringify(item)) : null;
          }),
          updateMany: vi.fn(async ({ where, data }: any) => {
            const item = dbStore.get(where.id);
            if (!item || (where.version !== undefined && item.version !== where.version)) {
              return { count: 0 };
            }
            const updated = {
              ...item,
              perms: data.perms,
              version: data.version || (item.version || 1) + 1,
              updatedAt: new Date(),
            };
            dbStore.set(where.id, updated);
            return { count: 1 };
          }),
        },
        $executeRawUnsafe: vi.fn(async () => 1),
        $queryRawUnsafe: vi.fn(async (sql: string, id: string) => {
          if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
            const item = dbStore.get(id);
            return item ? [JSON.parse(JSON.stringify(item))] : [];
          }
          return [];
        }),
        $transaction: vi.fn(async (cb: any) => {
          const prev = txQueue;
          let release: () => void;
          txQueue = new Promise<void>((resolve) => {
            release = resolve;
          });
          await prev;
          try {
            return await cb(mockDb);
          } finally {
            release!();
          }
        }),
      };

      return { mockDb, dbStore };
    }

    it('strictly prevents update attempts on Super Admin (role_1) with 400 Bad Request', async () => {
      const { mockDb } = createMockPrismaWithRoles();

      await expect(
        adminRoleRepository.updateRoleAtomic(
          'role_1',
          (current) => current,
          undefined,
          mockDb,
        ),
      ).rejects.toThrow(/Super Admin permissions are immutable/i);
    });

    it('rejects update attempts on removed or non-existent roles with 404 Not Found', async () => {
      const { mockDb } = createMockPrismaWithRoles();

      await expect(
        adminRoleRepository.updateRoleAtomic(
          'role_2',
          (current) => current,
          undefined,
          mockDb,
        ),
      ).rejects.toThrow(/Role 'role_2'/i);
    });
  });
});
