import type { Request, Response } from 'express';
import { appProfileService } from './appProfile.service';

export const appProfileController = {
  async updateProfile(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const data = req.body;
    const user = await appProfileService.updateProfile(userId, data);
    res.json({ success: true, data: { user } });
  },

  async getAddresses(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const addresses = await appProfileService.getAddresses(userId);
    res.json({ success: true, data: addresses });
  },

  async syncAddresses(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const addresses = Array.isArray(req.body)
      ? req.body
      : (req.body?.addresses || []);
    const synced = await appProfileService.syncAddresses(userId, addresses);
    res.json({ success: true, data: synced });
  },

  async getEmergencyContacts(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const contacts = await appProfileService.getEmergencyContacts(userId);
    res.json({ success: true, data: contacts });
  },

  async syncEmergencyContacts(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const contacts = Array.isArray(req.body)
      ? req.body
      : (req.body?.contacts || []);
    const synced = await appProfileService.syncEmergencyContacts(userId, contacts);
    res.json({ success: true, data: synced });
  },

  async deleteAccount(req: Request, res: Response) {
    const userId = req.auth!.userId;
    const { reason } = req.body || {};
    const result = await appProfileService.deleteAccount(userId, reason);
    res.json(result);
  },
};
