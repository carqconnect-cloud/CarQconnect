import { Request, Response } from 'express';
import { ticketsService } from './tickets.service';
import { ApiResponse } from '../../../common/utils/apiResponse';
import { ApiError } from '../../../common/utils/apiError';

export const ticketsController = {
  async raiseTicket(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const { category, subject, description, hasScreenshot, screenshotName, priority, email, phone, name } = req.body;

    if (!category || typeof category !== 'string' || !category.trim()) {
      throw ApiError.badRequest('Issue category is required');
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      throw ApiError.badRequest('Subject is required');
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      throw ApiError.badRequest('Description is required');
    }

    const result = await ticketsService.raiseTicket(userId, {
      category: category.trim(),
      subject: subject.trim(),
      description: description.trim(),
      hasScreenshot: Boolean(hasScreenshot),
      screenshotName: screenshotName ? String(screenshotName).trim() : undefined,
      priority: priority ? String(priority).trim().toUpperCase() : 'MEDIUM',
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      name: name ? String(name).trim() : undefined,
    });

    return ApiResponse.created(res, result);
  },

  async getMyTickets(req: Request, res: Response) {
    const userId = (req as any).auth?.userId;
    const email = req.query.email as string | undefined;
    const phone = req.query.phone as string | undefined;

    const tickets = await ticketsService.getMyTickets(userId, email, phone);
    return ApiResponse.ok(res, tickets);
  },
};
