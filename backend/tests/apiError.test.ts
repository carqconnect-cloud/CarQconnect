import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/common/utils/apiError';
import { ErrorCode } from '../src/common/constants/http';

describe('ApiError', () => {
  it('builds a 404 with the resource name', () => {
    const error = ApiError.notFound('Lead');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Lead not found');
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('carries validation details', () => {
    const error = ApiError.badRequest('Invalid', [{ field: 'email', message: 'required' }]);
    expect(error.statusCode).toBe(400);
    expect(error.details).toHaveLength(1);
  });

  it('is an operational error', () => {
    expect(ApiError.forbidden().isOperational).toBe(true);
  });
});
