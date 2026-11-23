import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/common/utils/jwt';

describe('Admin Operational Reports & CSV Exports — Real PostgreSQL Integration Suite (fioner_test)', () => {
  const app = createApp();

  const uniqueSuffix = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let superAdminId: string;
  let superAdminEmail: string;
  let superAdminToken: string;

  let testUserId: string;
  let testUserEmail: string;

  let testOrderId: string;
  let formulaOrderId: string;

  beforeAll(async () => {
    // 1. Mandatory Safety Verification: target must be 'fioner_test'
    const dbIdentity = await prisma.$queryRaw<Array<{ current_database: string; inet_server_port: number }>>`
      SELECT current_database(), inet_server_port();
    `;
    const activeDb = dbIdentity[0]?.current_database;
    if (activeDb !== 'fioner_test') {
      throw new Error(`SAFETY ABORT: Test target database is '${activeDb}', expected 'fioner_test'.`);
    }

    // 2. Create Super Admin actor
    superAdminEmail = `superadmin_${uniqueSuffix}@fioner.test`;
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: 'hashed_pw_reports_test',
        firstName: 'Report',
        lastName: 'Admin',
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;
    superAdminToken = signAccessToken({
      sub: superAdmin.id,
      email: superAdmin.email,
      isSuperAdmin: true,
    });

    // 3. Create a test customer user and orders for reporting data
    testUserEmail = `customer_${uniqueSuffix}@fioner.test`;
    const testUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: 'hashed_pw_customer',
        firstName: 'Operational',
        lastName: 'Tester',
        phone: '+919876543210',
        isActive: true,
        isSuperAdmin: false,
      },
    });
    testUserId = testUser.id;

    const testOrder = await prisma.order.create({
      data: {
        orderNo: `ORD-${uniqueSuffix.toUpperCase()}`,
        userId: testUserId,
        customerName: 'Operational Tester',
        customerEmail: testUserEmail,
        customerPhone: '+919876543210',
        amount: 1499.0,
        currency: 'INR',
        status: 'PLACED',
        payStatus: 'PAID',
      },
    });
    testOrderId = testOrder.id;

    // 4. Create an order with formula injection payload to test CSV sanitization in real DB
    const formulaOrder = await prisma.order.create({
      data: {
        orderNo: `ORDF-${uniqueSuffix.toUpperCase()}`,
        userId: testUserId,
        customerName: '=SUM(1,2)',
        customerEmail: `inj_${testUserEmail}`,
        customerPhone: '+919876543211',
        amount: 999.0,
        currency: 'INR',
        status: 'CONFIRMED',
        payStatus: 'PAID',
      },
    });
    formulaOrderId = formulaOrder.id;
  });

  afterAll(async () => {
    // Clean up only test-created records
    if (formulaOrderId) {
      await prisma.order.deleteMany({ where: { id: formulaOrderId } });
    }
    if (testOrderId) {
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    if (superAdminId) {
      await prisma.auditLog.deleteMany({ where: { actorId: superAdminId } });
      await prisma.user.deleteMany({ where: { id: superAdminId } });
    }
  });

  it('GET /api/v1/admin/reports returns all 8 operational reports with live counts', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(8);

    const keys = res.body.data.map((r: any) => r.key);
    expect(keys).toContain('users');
    expect(keys).toContain('revenue');
    expect(keys).toContain('qr-scans');
    expect(keys).toContain('device-activation');
    expect(keys).toContain('membership-conv');
    expect(keys).toContain('support-volume');
    expect(keys).toContain('ai-containment');
    expect(keys).toContain('call-outcomes');

    const usersReport = res.body.data.find((r: any) => r.key === 'users');
    expect(usersReport.totalCount).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/v1/admin/reports/users returns paginated user records from PostgreSQL', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/users?limit=10')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.reportKey).toBe('users');
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.data)).toBe(true);

    const found = res.body.data.find((u: any) => u.email === testUserEmail);
    expect(found).toBeDefined();
    expect(found.name).toBe('Operational Tester');
    expect(found.role).toBe('User');
    expect(found.status).toBe('Active');
  });

  it('GET /api/v1/admin/reports/revenue returns real order records', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/revenue?status=PAID')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.reportKey).toBe('revenue');

    const foundOrder = res.body.data.find((o: any) => o.customerEmail === testUserEmail);
    expect(foundOrder).toBeDefined();
    expect(foundOrder.amount).toBe(1499);
    expect(foundOrder.currency).toBe('INR');
    expect(foundOrder.payStatus).toBe('PAID');
  });

  it('GET /api/v1/admin/reports/users/export downloads RFC 4180 CSV and writes audit entry', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/users/export')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="users_report_\d{4}-\d{2}-\d{2}\.csv"/,
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('no-store');

    // CSV format validation
    const lines = res.text.split('\r\n');
    expect(lines.length).toBeGreaterThan(2);
    expect(lines[0]).toBe('User ID,Name,Email,Phone,Status,Role,Joined Date,Last Login');

    const csvIncludesUser = res.text.includes(testUserEmail);
    expect(csvIncludesUser).toBe(true);

    // Audit log verification in PostgreSQL
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        actorId: superAdminId,
        action: 'admin_report.exported',
        entity: 'Report',
        entityId: 'users',
      },
    });

    expect(auditRecord).not.toBeNull();
    const metadata = auditRecord?.metadata as any;
    expect(metadata?.reportKey).toBe('users');
    expect(metadata?.format).toBe('csv');
    expect(metadata?.rowCount).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/v1/admin/reports/revenue/export sanitizes spreadsheet formula injection in database rows', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/revenue/export')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    // The order with customerName '=SUM(1,2)' must be sanitized with leading single quote: '=SUM(1,2)
    expect(res.text).toContain("'=SUM(1,2)");
    // Must NOT contain raw unsanitized formula marker at the field start
    expect(res.text).not.toContain(",=SUM(1,2)");
  });

  it('GET /api/v1/admin/reports/ai-containment returns aggregated governance records', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports/ai-containment')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.reportKey).toBe('ai-containment');
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
