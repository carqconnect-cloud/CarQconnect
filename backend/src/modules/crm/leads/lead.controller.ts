import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/utils/apiResponse';
import { leadService } from './lead.service';
import type { CreateLeadInput, ListLeadsInput, UpdateLeadInput } from './lead.schema';

import { ApiError } from '../../../common/utils/apiError';

export function orgOf(req: Request): string {
  if (!req.tenant) throw ApiError.forbidden('Organization context required');
  return req.tenant.organizationId;
}

export const leadController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await leadService.list(
      await orgOf(req),
      req.query as unknown as ListLeadsInput,
    );
    return ApiResponse.ok(res, items, meta);
  },

  async stats(req: Request, res: Response) {
    return ApiResponse.ok(res, await leadService.stats(await orgOf(req)));
  },

  async get(req: Request, res: Response) {
    return ApiResponse.ok(res, await leadService.getById(await orgOf(req), req.params.id as string));
  },

  async create(req: Request, res: Response) {
    return ApiResponse.created(
      res,
      await leadService.create(await orgOf(req), req.body as CreateLeadInput),
    );
  },

  async update(req: Request, res: Response) {
    const lead = await leadService.update(
      await orgOf(req),
      req.params.id as string,
      req.body as UpdateLeadInput,
    );
    return ApiResponse.ok(res, lead);
  },

  async remove(req: Request, res: Response) {
    const orgId = orgOf(req);
    await leadService.remove(orgId, req.params.id as string, req.auth?.userId, req.ip);
    return ApiResponse.noContent(res);
  },

  async createPublicLead(req: Request, res: Response) {
    const { name, fullName, contact, email, phone, company, source, topic, subject, message, notes, value, organizationId } = req.body;

    const leadName = String(name || fullName || '').trim();
    if (!leadName) {
      throw ApiError.badRequest('Name is required');
    }

    let leadEmail = email ? String(email).trim() : undefined;
    let leadPhone = phone ? String(phone).trim() : undefined;

    if (contact && (!leadEmail || !leadPhone)) {
      const contactStr = String(contact).trim();
      if (contactStr.includes('@')) {
        leadEmail = leadEmail || contactStr;
      } else {
        leadPhone = leadPhone || contactStr;
      }
    }

    const lead = await leadService.createPublicLead({
      name: leadName,
      email: leadEmail,
      phone: leadPhone,
      company: company ? String(company).trim() : undefined,
      source: source || 'Website Contact',
      topic: topic ? String(topic).trim() : undefined,
      subject: subject ? String(subject).trim() : undefined,
      message: message ? String(message).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      value: value !== undefined ? Number(value) : undefined,
      organizationId: organizationId ? String(organizationId).trim() : undefined,
    });

    return ApiResponse.created(res, lead);
  },
};
