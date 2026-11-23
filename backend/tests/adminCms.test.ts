import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createBannerSchema,
  updateBannerSchema,
  createCampaignSchema,
  updateCampaignSchema,
  audiencePreviewQuerySchema,
} from '../src/modules/admin/cms/adminCms.schema';
import { adminCmsService } from '../src/modules/admin/cms/adminCms.service';
import { adminCmsRepository } from '../src/modules/admin/cms/adminCms.repository';
import { auditService } from '../src/modules/audit/audit.service';
import { ApiError } from '../src/common/utils/apiError';

describe('Admin CMS & Campaigns — Unit Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Banner Schema Validation', () => {
    it('accepts valid banner creation payload', () => {
      const payload = {
        title: 'Festive Season 20% Off',
        schedule: '01 Nov – 15 Nov 2026',
        status: 'draft',
        targetUrl: 'https://fioner.in/offers',
        priority: 10,
      };

      const result = createBannerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Festive Season 20% Off');
        expect(result.data.status).toBe('draft');
      }
    });

    it('rejects empty banner title', () => {
      const payload = {
        title: '   ',
        schedule: 'Ongoing',
      };

      const result = createBannerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects unsafe targetUrl with javascript: scheme', () => {
      const payload = {
        title: 'Malicious banner',
        targetUrl: 'javascript:alert(1)',
      };

      const result = createBannerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects unsafe targetUrl with data: scheme', () => {
      const payload = {
        title: 'Data scheme banner',
        targetUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      };

      const result = createBannerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('accepts relative targetUrl', () => {
      const payload = {
        title: 'Internal route banner',
        targetUrl: '/membership/renew',
      };

      const result = createBannerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid banner status enum', () => {
      const payload = {
        title: 'Invalid status',
        status: 'DELETED',
      };

      const result = createBannerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Notification Campaign Schema Validation', () => {
    it('accepts valid campaign creation payload', () => {
      const payload = {
        name: 'Diwali Renewal Campaign',
        channel: 'SMS + Push',
        audience: 'Expiring in 15 days',
        message: 'Renew your Rakshak plan today!',
        status: 'Draft',
      };

      const result = createCampaignSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Diwali Renewal Campaign');
        expect(result.data.channel).toBe('SMS + Push');
        expect(result.data.audience).toBe('Expiring in 15 days');
      }
    });

    it('rejects unsupported audience segment', () => {
      const payload = {
        name: 'Unsupported Audience',
        channel: 'Push',
        audience: 'All VIP users', // not in approved audience list
      };

      const result = createCampaignSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects unsupported channel', () => {
      const payload = {
        name: 'Unsupported Channel',
        channel: 'WhatsApp', // not in approved channel list
        audience: 'All active users',
      };

      const result = createCampaignSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('validates audience preview query schema', () => {
      expect(
        audiencePreviewQuerySchema.safeParse({
          audience: 'Users without emergency contact',
        }).success,
      ).toBe(true);

      expect(
        audiencePreviewQuerySchema.safeParse({
          audience: 'Balance < ₹100',
        }).success,
      ).toBe(true);

      expect(
        audiencePreviewQuerySchema.safeParse({
          audience: 'Random Audience',
        }).success,
      ).toBe(false);
    });
  });

  describe('CMS Service Business Logic & Lifecycle', () => {
    it('throws 404 when getting non-existent banner', async () => {
      vi.spyOn(adminCmsRepository, 'findBannerById').mockResolvedValue(null);

      await expect(
        adminCmsService.getBannerById('non-existent-banner'),
      ).rejects.toThrow(ApiError);
    });

    it('toggles banner status from live to paused', async () => {
      vi.spyOn(adminCmsRepository, 'findBannerById').mockResolvedValue({
        id: 'ban_1',
        title: 'Live Banner',
        schedule: 'Ongoing',
        status: 'live',
        targetUrl: null,
        imageUrl: null,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateSpy = vi
        .spyOn(adminCmsRepository, 'updateBanner')
        .mockResolvedValue({
          id: 'ban_1',
          title: 'Live Banner',
          schedule: 'Ongoing',
          status: 'paused',
          targetUrl: null,
          imageUrl: null,
          priority: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const result = await adminCmsService.toggleBannerStatus('ban_1', 'admin_123');

      expect(updateSpy).toHaveBeenCalledWith('ban_1', { status: 'paused' });
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin_banner.status_updated',
          entity: 'Banner',
          entityId: 'ban_1',
          actorId: 'admin_123',
        }),
      );
      expect(result.status).toBe('paused');
    });

    it('throws 404 when getting non-existent campaign', async () => {
      vi.spyOn(adminCmsRepository, 'findCampaignById').mockResolvedValue(null);

      await expect(
        adminCmsService.getCampaignById('non-existent-cmp'),
      ).rejects.toThrow(ApiError);
    });

    it('rejects editing a campaign that is already Sent', async () => {
      vi.spyOn(adminCmsRepository, 'findCampaignById').mockResolvedValue({
        id: 'cmp_1',
        name: 'Sent Campaign',
        channel: 'SMS',
        audience: 'All active users',
        message: 'Hello',
        status: 'Sent',
        scheduledAt: null,
        sentAt: new Date(),
        targetCount: 15,
        isSimulated: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        adminCmsService.updateCampaign('cmp_1', { name: 'Renamed Campaign' }),
      ).rejects.toThrow('Cannot edit a campaign that has already been sent');
    });

    it('rejects sending a campaign that has already been Sent', async () => {
      vi.spyOn(adminCmsRepository, 'findCampaignById').mockResolvedValue({
        id: 'cmp_1',
        name: 'Sent Campaign',
        channel: 'Push',
        audience: 'All active users',
        message: 'Hello',
        status: 'Sent',
        scheduledAt: null,
        sentAt: new Date(),
        targetCount: 15,
        isSimulated: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(adminCmsService.sendCampaign('cmp_1')).rejects.toThrow(
        'Campaign has already been sent',
      );
    });

    it('truthfully executes simulation and transitions status to Sent with audit logging', async () => {
      vi.spyOn(adminCmsRepository, 'findCampaignById').mockResolvedValue({
        id: 'cmp_draft',
        name: 'Draft Campaign',
        channel: 'Push',
        audience: 'Users without emergency contact',
        message: 'Add emergency contact!',
        status: 'Draft',
        scheduledAt: null,
        sentAt: null,
        targetCount: 0,
        isSimulated: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(adminCmsRepository, 'calculateAudienceCount').mockResolvedValue(42);

      const updateSpy = vi
        .spyOn(adminCmsRepository, 'updateCampaign')
        .mockImplementation(async (_id, data: any) => ({
          id: 'cmp_draft',
          name: 'Draft Campaign',
          channel: 'Push',
          audience: 'Users without emergency contact',
          message: 'Add emergency contact!',
          status: data.status,
          scheduledAt: null,
          sentAt: data.sentAt,
          targetCount: data.targetCount,
          isSimulated: data.isSimulated,
          metadata: data.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValue({} as any);

      const result = await adminCmsService.sendCampaign('cmp_draft', 'admin_actor_1');

      expect(result.status).toBe('Sent');
      expect(result.targetCount).toBe(42);
      expect(result.isSimulated).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith(
        'cmp_draft',
        expect.objectContaining({
          status: 'Sent',
          targetCount: 42,
          isSimulated: true,
        }),
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin_campaign.sent',
          entity: 'NotificationCampaign',
          entityId: 'cmp_draft',
          actorId: 'admin_actor_1',
          metadata: expect.objectContaining({
            targetCount: 42,
            isSimulated: true,
          }),
        }),
      );
    });

    it('returns audience preview metadata for all approved segments', async () => {
      vi.spyOn(adminCmsRepository, 'calculateAudienceCount').mockResolvedValue(10);

      const p1 = await adminCmsService.previewAudience('All active users');
      expect(p1.count).toBe(10);
      expect(p1.description).toContain('active account status');

      const p2 = await adminCmsService.previewAudience('Balance < ₹100');
      expect(p2.description).toContain('balance below ₹100');
    });
  });
});
