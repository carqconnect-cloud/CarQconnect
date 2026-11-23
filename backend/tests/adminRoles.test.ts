import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';
import {
  adminRoleRepository,
  loadBootstrapRoles,
} from '../src/modules/admin/roles/adminRole.repository';
import { auditService } from '../src/modules/audit/audit.service';

describe('Super Admin Platform Roles and Permissions Endpoints (/api/v1/admin/roles/*)', () => {
  const app = createApp();

  const superAdminToken = signAccessToken({
    sub: 'user_super_admin_1',
    email: 'super@fioner.test',
    isSuperAdmin: true,
  });

  const normalUserToken = signAccessToken({
    sub: 'user_regular_1',
    email: 'user@fioner.test',
    isSuperAdmin: false,
  });

  let rolesStore: Map<string, any>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    adminRoleRepository.resetInitializationFlag();

    // Isolated in-memory store representing authoritative PostgreSQL platform_roles table
    rolesStore = new Map<string, any>();
    const bootstrapRoles = loadBootstrapRoles();
    for (const r of bootstrapRoles) {
      rolesStore.set(r.id, {
        id: r.id,
        name: r.name,
        desc: r.desc,
        perms: JSON.parse(JSON.stringify(r.perms)),
        version: 1,
        updatedAt: new Date(),
      });
    }

    vi.spyOn(prisma.platformRole, 'count').mockImplementation(async () => rolesStore.size);
    vi.spyOn(prisma.platformRole, 'findMany').mockImplementation(async () =>
      Array.from(rolesStore.values()).sort((a, b) => a.id.localeCompare(b.id)),
    );
    vi.spyOn(prisma.platformRole, 'findUnique').mockImplementation(async ({ where }: any) => {
      const item = rolesStore.get(where.id);
      return item ? JSON.parse(JSON.stringify(item)) : null;
    });
    vi.spyOn(prisma.platformRole, 'update').mockImplementation(async ({ where, data }: any) => {
      const item = rolesStore.get(where.id);
      if (!item) throw new Error('Record not found');
      const updated = {
        ...item,
        perms: data.perms,
        version: (item.version || 1) + 1,
        updatedAt: new Date(),
      };
      rolesStore.set(where.id, updated);
      return JSON.parse(JSON.stringify(updated));
    });
    vi.spyOn(prisma.platformRole, 'updateMany').mockImplementation(async ({ where, data }: any) => {
      const item = rolesStore.get(where.id);
      if (!item || (where.version !== undefined && item.version !== where.version)) {
        return { count: 0 };
      }
      const updated = {
        ...item,
        perms: data.perms,
        version: (item.version || 1) + 1,
        updatedAt: new Date(),
      };
      rolesStore.set(where.id, updated);
      return { count: 1 };
    });
    vi.spyOn(prisma.platformRole, 'upsert').mockImplementation(async ({ where, create }: any) => {
      if (!rolesStore.has(where.id)) {
        rolesStore.set(where.id, { ...create, id: where.id, version: 1, updatedAt: new Date() });
      }
      return JSON.parse(JSON.stringify(rolesStore.get(where.id)));
    });
    vi.spyOn(prisma.platformRole, 'deleteMany').mockImplementation(async () => {
      const count = rolesStore.size;
      rolesStore.clear();
      return { count };
    });
    vi.spyOn(prisma, '$executeRawUnsafe').mockResolvedValue(1);
    vi.spyOn(prisma, '$queryRawUnsafe').mockImplementation(async (sql: string, id: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        const item = rolesStore.get(id);
        return item ? [JSON.parse(JSON.stringify(item))] : [];
      }
      return [];
    });
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));

    vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async (args: any) => {
      if (args.where?.id === 'user_super_admin_1') {
        return { isSuperAdmin: true, isActive: true } as any;
      }
      if (args.where?.id === 'user_regular_1') {
        return { isSuperAdmin: false, isActive: true } as any;
      }
      return null;
    });
  });

  describe('Authorization and Security Boundary', () => {
    it('1. rejects unauthenticated access with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/roles');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. rejects non-super-admin user with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/roles', () => {
    it('3. returns all 5 canonical platform roles with Super Admin full-access invariant', async () => {
      const res = await request(app)
        .get('/api/v1/admin/roles')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toHaveLength(1);

      const superAdminRole = res.body.data.find((r: any) => r.id === 'role_1');
      expect(superAdminRole).toBeDefined();
      expect(superAdminRole.name).toBe('Super Admin');
      expect(superAdminRole.perms).toBe('all');

      // Verify removed roles are not present
      const removedRoles = ['role_2', 'role_3', 'role_4', 'role_5'];
      for (const removedId of removedRoles) {
        expect(res.body.data.find((r: any) => r.id === removedId)).toBeUndefined();
      }
    });
  });

  describe('PATCH /api/v1/admin/roles/:id', () => {
    it('4. strictly rejects any attempt to modify Super Admin (role_1) permissions with 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/roles/role_1')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          perms: {
            Users: ['view'],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Super Admin permissions are immutable');
    });

    it('5. rejects unknown or removed role ID with 404 NOT_FOUND', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/roles/role_2')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          module: 'Users',
          perm: 'view',
          enabled: true,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
