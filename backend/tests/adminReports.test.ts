import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import {
  adminReportsService,
  escapeCsvField,
  formatCsv,
} from '../src/modules/admin/reports/adminReports.service';
import { adminReportsRepository } from '../src/modules/admin/reports/adminReports.repository';
import { auditService } from '../src/modules/audit/audit.service';
import { prisma } from '../src/config/database';

vi.mock('../src/modules/admin/reports/adminReports.service', async () => {
  const actual = await vi.importActual<
    typeof import('../src/modules/admin/reports/adminReports.service')
  >('../src/modules/admin/reports/adminReports.service');
  return {
    ...actual,
    adminReportsService: {
      ...actual.adminReportsService,
      getReportsSummary: vi.fn(),
      getReportData: vi.fn(),
      exportReportCsv: vi.fn(),
    },
  };
});

vi.mock('../src/modules/audit/audit.service');

describe('Admin Operational Reports & CSV Exports Module (Phase 3B)', () => {
  const app = createApp();

  const superAdminUser = {
    id: 'super_admin_reports_test',
    email: 'super_admin_reports@fioner.test',
    isSuperAdmin: true,
    isActive: true,
  };

  const regularUser = {
    id: 'regular_user_reports_test',
    email: 'regular_user_reports@fioner.test',
    isSuperAdmin: false,
    isActive: true,
  };

  const superAdminToken = signAccessToken({
    sub: superAdminUser.id,
    email: superAdminUser.email,
    isSuperAdmin: true,
  });

  const regularUserToken = signAccessToken({
    sub: regularUser.id,
    email: regularUser.email,
    isSuperAdmin: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(prisma.user, 'findUnique').mockImplementation((async (args: any) => {
      const id = args?.where?.id;
      if (id === superAdminUser.id) return superAdminUser as never;
      if (id === regularUser.id) return regularUser as never;
      return null as never;
    }) as any);
  });

  describe('1. Authentication and Super Admin Authorization', () => {
    it('rejects unauthenticated requests with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/admin/reports');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects non-super-admin authenticated requests with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows active Super Admin requests', async () => {
      vi.mocked(adminReportsService.getReportsSummary).mockResolvedValueOnce([
        { key: 'users', label: 'User growth', totalCount: 42 },
        { key: 'revenue', label: 'Revenue', totalCount: 15 },
        { key: 'qr-scans', label: 'QR scans', totalCount: 88 },
        { key: 'device-activation', label: 'Device activations', totalCount: 12 },
        { key: 'membership-conv', label: 'Membership conversion', totalCount: 30 },
        { key: 'support-volume', label: 'Support volume', totalCount: 7 },
        { key: 'ai-containment', label: 'AI containment', totalCount: 25 },
        { key: 'call-outcomes', label: 'Call outcomes', totalCount: 50 },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(8);
      expect(res.body.data[0].key).toBe('users');
      expect(res.body.data[0].totalCount).toBe(42);
    });
  });

  describe('2. Report Key Validation & Filtering', () => {
    it('rejects invalid report keys with 400 validation error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/unsupported-key')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retrieves paginated data for valid report key (users)', async () => {
      vi.mocked(adminReportsService.getReportData).mockResolvedValueOnce({
        reportKey: 'users',
        label: 'User growth',
        headers: [
          { key: 'id', label: 'User ID' },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
        ],
        rows: [
          { id: 'u1', name: 'Ravi Sharma', email: 'ravi@example.com' },
          { id: 'u2', name: 'Priya Patel', email: 'priya@example.com' },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/reports/users?page=1&limit=50&status=active')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.reportKey).toBe('users');
      expect(res.body.meta.pagination.total).toBe(2);
      expect(adminReportsService.getReportData).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({ page: 1, limit: 50, status: 'active' }),
      );
    });

    it('passes date range filters correctly', async () => {
      vi.mocked(adminReportsService.getReportData).mockResolvedValueOnce({
        reportKey: 'revenue',
        label: 'Revenue',
        headers: [{ key: 'orderNo', label: 'Order No' }],
        rows: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 100,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      const res = await request(app)
        .get('/api/v1/admin/reports/revenue?startDate=2026-01-01&endDate=2026-06-30')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(adminReportsService.getReportData).toHaveBeenCalledWith(
        'revenue',
        expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-06-30' }),
      );
    });
  });

  describe('3. CSV Export Endpoints, Headers, and Security Directives', () => {
    it('exports CSV via /:reportKey/export with correct security and MIME headers', async () => {
      const mockCsv = 'User ID,Name,Email\r\nu1,Ravi Sharma,ravi@example.com';
      vi.mocked(adminReportsService.exportReportCsv).mockResolvedValueOnce({
        filename: 'users_report_2026-10-21.csv',
        csvContent: mockCsv,
        rowCount: 1,
        totalAvailable: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/reports/users/export')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="users_report_2026-10-21.csv"',
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.text).toBe(mockCsv);
      expect(adminReportsService.exportReportCsv).toHaveBeenCalledWith(
        'users',
        expect.anything(),
        superAdminUser.id,
      );
    });

    it('exports CSV via /:reportKey?format=csv with correct security headers', async () => {
      const mockCsv = 'Order No,Amount\r\nORD-1001,499';
      vi.mocked(adminReportsService.exportReportCsv).mockResolvedValueOnce({
        filename: 'revenue_report_2026-10-21.csv',
        csvContent: mockCsv,
        rowCount: 1,
        totalAvailable: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/reports/revenue?format=csv')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="revenue_report_2026-10-21.csv"',
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.text).toBe(mockCsv);
    });
  });

  describe('4. Spreadsheet Formula Injection (CWE-1236) Protection', () => {
    it('sanitizes cells starting with = by prepending single quote', () => {
      expect(escapeCsvField('=SUM(1+1)')).toBe("'=SUM(1+1)");
      expect(escapeCsvField('=1+2')).toBe("'=1+2");
    });

    it('sanitizes cells starting with + by prepending single quote', () => {
      expect(escapeCsvField('+cmd| /C calc!A0')).toBe("'+cmd| /C calc!A0");
      expect(escapeCsvField('+919876543210')).toBe("'+919876543210");
    });

    it('sanitizes cells starting with - (string) by prepending single quote', () => {
      expect(escapeCsvField('-2+3')).toBe("'-2+3");
      expect(escapeCsvField('-10')).toBe("'-10");
    });

    it('preserves native negative and positive numbers without prepending quotes', () => {
      expect(escapeCsvField(-42)).toBe('-42');
      expect(escapeCsvField(1499.5)).toBe('1499.5');
      expect(escapeCsvField(0)).toBe('0');
    });

    it('sanitizes cells starting with @ by prepending single quote', () => {
      expect(escapeCsvField('@SUM(A1:B10)')).toBe("'@SUM(A1:B10)");
    });

    it('sanitizes formula triggers preceded by leading spaces or tabs', () => {
      expect(escapeCsvField('   =SUM(1+2)')).toBe("'   =SUM(1+2)");
      expect(escapeCsvField('   =SUM(1,2)')).toBe('"\'   =SUM(1,2)"');
      expect(escapeCsvField('\t@alert(1)')).toBe("'\t@alert(1)");
      expect(escapeCsvField('  +cmd')).toBe("'  +cmd");
    });

    it('sanitizes formula triggers preceded by carriage returns or newlines', () => {
      const res = escapeCsvField('\r\n=1+1');
      expect(res).toBe('"\'\r\n=1+1"');
    });

    it('handles formula injection strings that also contain quotes and commas', () => {
      const res = escapeCsvField('=cmd|\' /C "calc"\'!A0');
      expect(res).toBe('"\'=cmd|\' /C ""calc""\'!A0"');
    });
  });

  describe('5. RFC 4180 CSV Escaping Engine & Data Minimization', () => {
    it('escapes quotes by doubling them', () => {
      expect(escapeCsvField('Hello "World"')).toBe('"Hello ""World"""');
    });

    it('wraps fields with commas in quotes', () => {
      expect(escapeCsvField('Delhi, India')).toBe('"Delhi, India"');
    });

    it('wraps fields with newlines in quotes', () => {
      expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('converts null and undefined to empty strings', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('formats dates to ISO strings', () => {
      const d = new Date('2026-10-21T00:00:00.000Z');
      expect(escapeCsvField(d)).toBe('2026-10-21T00:00:00.000Z');
    });

    it('formats multiple rows and headers with CRLF newlines', () => {
      const headers = [
        { key: 'code', label: 'QR Code' },
        { key: 'notes', label: 'Notes' },
      ];
      const rows = [
        { code: 'QR-001', notes: 'Normal' },
        { code: 'QR-002', notes: 'Has, comma and "quotes"' },
      ];
      const csv = formatCsv(headers, rows);
      const expected =
        'QR Code,Notes\r\nQR-001,Normal\r\nQR-002,"Has, comma and ""quotes"""';
      expect(csv).toBe(expected);
    });

    it('sanitizes multiple rows containing untrusted customer and note inputs', () => {
      const headers = [
        { key: 'customer', label: 'Customer' },
        { key: 'notes', label: 'Notes' },
      ];
      const rows = [
        { customer: '=DDE("cmd";"calc")', notes: '+91 9999999999' },
        { customer: 'Priya Patel', notes: '  @SUM(1,2)' },
      ];
      const csv = formatCsv(headers, rows);
      const lines = csv.split('\r\n');
      expect(lines[0]).toBe('Customer,Notes');
      expect(lines[1]).toBe('"\'=DDE(""cmd"";""calc"")",\'+91 9999999999');
      expect(lines[2]).toBe('Priya Patel,"\'  @SUM(1,2)"');
    });
  });
});
