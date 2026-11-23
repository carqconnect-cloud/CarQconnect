import { ErrorCode, HttpStatus, type ErrorCodeValue } from '../constants/http';

/**
 * The only error type services should throw on purpose.
 * error.middleware turns it into the standard error envelope.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeValue | string;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCodeValue | string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(HttpStatus.BAD_REQUEST, message, ErrorCode.VALIDATION_ERROR, details);
  }

  static unauthorized(
    message = 'Authentication required',
    code: ErrorCodeValue = ErrorCode.UNAUTHENTICATED,
  ) {
    return new ApiError(HttpStatus.UNAUTHORIZED, message, code);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(HttpStatus.FORBIDDEN, message, ErrorCode.FORBIDDEN);
  }

  static notFound(resource = 'Resource') {
    return new ApiError(HttpStatus.NOT_FOUND, `${resource} not found`, ErrorCode.NOT_FOUND);
  }

  static conflict(message = 'Resource already exists', details?: unknown) {
    return new ApiError(HttpStatus.CONFLICT, message, ErrorCode.CONFLICT, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(HttpStatus.TOO_MANY_REQUESTS, message, ErrorCode.RATE_LIMITED);
  }

  static internal(message = 'Something went wrong') {
    return new ApiError(HttpStatus.INTERNAL, message, ErrorCode.INTERNAL_ERROR);
  }
}
