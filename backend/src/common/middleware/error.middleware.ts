import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ErrorCode, HttpStatus } from '../constants/http';
import { ApiError } from '../utils/apiError';
import type { ErrorEnvelope } from '../utils/apiResponse';

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorEnvelope = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    requestId: req.requestId,
  };
  res.status(HttpStatus.NOT_FOUND).json(body);
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
    return new ApiError(
      HttpStatus.BAD_REQUEST,
      'Validation failed',
      ErrorCode.VALIDATION_ERROR,
      details,
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        return ApiError.conflict(`A record with this ${target} already exists`);
      }
      case 'P2025':
        return ApiError.notFound('Record');
      case 'P2003':
        return ApiError.badRequest('Related record does not exist');
      default:
        break;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return ApiError.badRequest('Invalid query');
  }

  return ApiError.internal();
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const apiError = toApiError(err);

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: apiError.statusCode,
    code: apiError.code,
    userId: req.auth?.userId,
    organizationId: req.tenant?.organizationId,
    err,
  };

  if (apiError.statusCode >= 500) logger.error(logPayload, apiError.message);
  else logger.warn(logPayload, apiError.message);

  const body: ErrorEnvelope = {
    success: false,
    error: {
      code: String(apiError.code),
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
    },
    requestId: req.requestId,
  };

  if (!env.isProd && apiError.statusCode >= 500 && err instanceof Error) {
    (body.error as Record<string, unknown>).stack = err.stack;
  }

  res.status(apiError.statusCode).json(body);
};
