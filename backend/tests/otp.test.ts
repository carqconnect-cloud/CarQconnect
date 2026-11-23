import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

describe('Auth OTP Endpoints (/api/v1/auth/send-otp & verify-otp)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('returns 200 and success message when email is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email: 'test_otp@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('OTP sent successfully');
      // Verify OTP code is NEVER leaked in response
      expect(res.body.data.code).toBeUndefined();
    });

    it('returns 200 and success message when phone is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+919876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('OTP sent successfully');
      expect(res.body.data.code).toBeUndefined();
    });

    it('returns 400 when neither email nor phone is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('required');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('returns 400 when missing OTP field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'test_otp@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('OTP code is required');
    });

    it('returns 400 when missing email/phone identifier', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Email or mobile number is required');
    });

    it('returns 200 when valid test OTP is verified', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'test_otp@example.com', otp: '1234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });

    it('returns 400 when wrong OTP code is provided', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email: 'test_otp@example.com', otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid or expired OTP');
    });
  });
});

