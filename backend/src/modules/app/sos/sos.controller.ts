import { Request, Response } from 'express';
import { sosService } from './sos.service';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { ApiError } from '../../../common/utils/apiError';

export const sosController = {
  async getSosData(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const email = req.query.email as string | undefined;
    const phone = req.query.phone as string | undefined;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const result = await sosService.getSosData(userId, { email, phone, lat, lng });
    return ApiResponse.ok(res, result);
  },

  async getNearestHospital(req: Request, res: Response) {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const result = await sosService.getNearestHospital(lat, lng);
    return ApiResponse.ok(res, result);
  },

  async addContact(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const { name, phone, relationship, isPrimary, email, userEmail, userPhone } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Contact name is required');
    }
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      throw ApiError.badRequest('Contact phone number is required');
    }

    const result = await sosService.addContact(userId, {
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship ? String(relationship).trim() : undefined,
      isPrimary: Boolean(isPrimary),
      email: email ? String(email).trim() : undefined,
      userEmail,
      userPhone,
    });

    return ApiResponse.created(res, result);
  },

  async updateContact(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;
    const { name, phone, relationship, isPrimary, email, userEmail, userPhone } = req.body;

    if (!id) {
      throw ApiError.badRequest('Contact ID is required');
    }

    const result = await sosService.updateContact(userId, id, {
      name: name ? String(name).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      relationship: relationship ? String(relationship).trim() : undefined,
      isPrimary: isPrimary !== undefined ? Boolean(isPrimary) : undefined,
      email: email ? String(email).trim() : undefined,
      userEmail,
      userPhone,
    });

    return ApiResponse.ok(res, result);
  },

  async deleteContact(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;
    const userEmail = req.query.userEmail as string | undefined;
    const userPhone = req.query.userPhone as string | undefined;

    if (!id) {
      throw ApiError.badRequest('Contact ID is required');
    }

    const result = await sosService.deleteContact(userId, id, userEmail, userPhone);
    return ApiResponse.ok(res, result);
  },

  async triggerAlert(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const { latitude, longitude, address, contactsNotified, email, phone, primaryPhone, primaryName } = req.body;

    const result = await sosService.triggerAlert(userId, {
      latitude: typeof latitude === 'number' ? latitude : undefined,
      longitude: typeof longitude === 'number' ? longitude : undefined,
      address: address ? String(address).trim() : undefined,
      contactsNotified: Array.isArray(contactsNotified) ? contactsNotified : [],
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      primaryPhone: primaryPhone ? String(primaryPhone).trim() : undefined,
      primaryName: primaryName ? String(primaryName).trim() : undefined,
    });

    return ApiResponse.ok(res, result);
  },

  async cancelAlert(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const { alertId, email, phone } = req.body || {};
    const effectiveAlertId = alertId && typeof alertId === 'string' ? alertId : 'LATEST';

    const result = await sosService.cancelAlert(userId, effectiveAlertId, email, phone);
    return ApiResponse.ok(res, result);
  },
};
