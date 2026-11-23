import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { signAccessToken } from '../src/common/utils/jwt';
import { prisma } from '../src/config/database';

describe('Notifications HTTP Endpoints (/api/v1/notifications/*)', () => {
  const app = createApp();

  const user = {
    id: 'user_notif_1',
    email: 'user_notif@fioner.test',
    isSuperAdmin: false,
    isActive: true,
  };

  const userToken = signAccessToken({
    sub: user.id,
    email: user.email,
    isSuperAdmin: false,
    portal: 'app',
  });

  const mockNotif = {
    id: 'notif_123',
    userId: user.id,
    title: 'FASTag Low Balance',
    description: 'Your FASTag wallet balance is below ₹200.',
    type: 'ALERT',
    isUnread: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/notifications', () => {
    it('returns 401 when no auth token is provided', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
    });

    it('returns 200 with user notifications list when authenticated', async () => {
      vi.spyOn(prisma.notification, 'findMany').mockResolvedValueOnce([mockNotif] as never);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(mockNotif.id);
    });
  });

  describe('POST /api/v1/notifications', () => {
    it('successfully creates an in-app notification', async () => {
      vi.spyOn(prisma.notification, 'create').mockResolvedValueOnce(mockNotif as never);

      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'FASTag Low Balance',
          description: 'Your FASTag wallet balance is below ₹200.',
          type: 'ALERT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(mockNotif.title);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'ALERT' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/notifications/mark-read', () => {
    it('marks all unread notifications as read', async () => {
      vi.spyOn(prisma.notification, 'updateMany').mockResolvedValueOnce({ count: 2 } as never);

      const res = await request(app)
        .post('/api/v1/notifications/mark-read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('deletes notification by ID', async () => {
      vi.spyOn(prisma.notification, 'findFirst').mockResolvedValueOnce(mockNotif as never);
      vi.spyOn(prisma.notification, 'delete').mockResolvedValueOnce(mockNotif as never);

      const res = await request(app)
        .delete('/api/v1/notifications/notif_123')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

