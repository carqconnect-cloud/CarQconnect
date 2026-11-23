import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and REPLACES req.body / req.query / req.params with parsed values,
 * so controllers get coerced, trimmed, typed data.
 *
 *   router.post('/', validate({ body: createLeadSchema }), asyncHandler(create));
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      next(error instanceof ZodError ? error : error);
    }
  };
}

/** Helper for typing a controller's parsed body: `TypedBody<typeof schema>` */
export type TypedBody<S extends ZodTypeAny> = z.infer<S>;
