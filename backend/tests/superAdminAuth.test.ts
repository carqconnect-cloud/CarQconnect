import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

describe('Super Admin & Sub-Super Admin Auth End-to-End', () => {
  const app = createApp();

  const testSuperAdmin = {
    firstName: 'Master',
    lastName: 'Admin',
    email: `test_superadmin_${Date.now()}@fioner.com`,
    phone: '+919999988888',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    securityKey: env.SUPER_ADMIN_SECURITY_KEY || 'FIONER@SUPERADMIN#2026',
  };

  const testSubAdmin = {
    firstName: 'Sub',
    lastName: 'Commander',
    email: `test_subadmin_${Date.now()}@fioner.com`,
    phone: '+919999977777',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    roleTitle: 'Regional Ops Manager',
    permissions: ['vehicles', 'orders', 'support'],
  };

  let superAdminToken = '';

  it('rejects Super Admin registration if security key is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/admin/register')
      .send({
        ...testSuperAdmin,
        securityKey: 'WRONG_KEY_123',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects Super Admin registration if passwords do not match', async () => {
    const res = await request(app)
      .post('/api/v1/auth/admin/register')
      .send({
        ...testSuperAdmin,
        confirmPassword: 'MismatchPassword#999',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('successfully registers Super Admin into super_admins table', async () => {
    const res = await request(app)
      .post('/api/v1/auth/admin/register')
      .send(testSuperAdmin);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.superAdmin.email).toBe(testSuperAdmin.email.toLowerCase());

    const inDb = await prisma.superAdmin.findUnique({
      where: { email: testSuperAdmin.email.toLowerCase() },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.firstName).toBe(testSuperAdmin.firstName);
  });

  it('successfully logs in Super Admin via /api/v1/auth/login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testSuperAdmin.email,
        password: testSuperAdmin.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isSuperAdmin).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    superAdminToken = res.body.data.tokens.accessToken;
  });

  it('rejects adding a sub-super admin without Super Admin token', async () => {
    const res = await request(app)
      .post('/api/v1/admin/sub-admins')
      .send(testSubAdmin);

    expect(res.status).toBe(401);
  });

  it('allows authenticated Super Admin to add Sub-Super Admin into sub_super_admins table', async () => {
    const res = await request(app)
      .post('/api/v1/admin/sub-admins')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(testSubAdmin);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testSubAdmin.email.toLowerCase());

    const inDb = await prisma.subSuperAdmin.findUnique({
      where: { email: testSubAdmin.email.toLowerCase() },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.roleTitle).toBe('Regional Ops Manager');
  });

  it('allows authenticated Super Admin to list all Sub-Super Admins', async () => {
    const res = await request(app)
      .get('/api/v1/admin/sub-admins')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((s: any) => s.email === testSubAdmin.email.toLowerCase());
    expect(found).toBeDefined();
  });

  it('successfully logs in Sub-Super Admin via /api/v1/auth/login', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testSubAdmin.email,
        password: testSubAdmin.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.isSuperAdmin).toBe(false);
    expect(res.body.data.user.isSubSuperAdmin).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();

    const subAdminToken = res.body.data.tokens.accessToken;

    // Sub-Super Admin cannot add another sub-super admin (restricted to Super Admins only)
    const createAttempt = await request(app)
      .post('/api/v1/admin/sub-admins')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        firstName: 'Unauthorized',
        lastName: 'Creation',
        email: 'unauth@fioner.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

    expect(createAttempt.status).toBe(403);
  });
});
