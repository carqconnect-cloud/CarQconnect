import type { Response } from 'express';
import { HttpStatus } from '../constants/http';

export interface ResponseMeta {
  [key: string]: unknown;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

/**
 * Every successful response looks the same:
 *   { "success": true, "data": ..., "meta": { ... } }
 * Keep it that way — the frontends unwrap `data` in one shared API client.
 */
export const ApiResponse = {
  ok<T>(res: Response, data: T, meta?: ResponseMeta) {
    const body: SuccessEnvelope<T> = { success: true, data };
    if (meta) body.meta = meta;
    return res.status(HttpStatus.OK).json(body);
  },

  created<T>(res: Response, data: T, meta?: ResponseMeta) {
    const body: SuccessEnvelope<T> = { success: true, data };
    if (meta) body.meta = meta;
    return res.status(HttpStatus.CREATED).json(body);
  },

  noContent(res: Response) {
    return res.status(HttpStatus.NO_CONTENT).send();
  },
};
