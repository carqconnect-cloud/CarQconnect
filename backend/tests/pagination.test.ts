import { describe, expect, it } from 'vitest';
import {
  buildPaginationMeta,
  getPaginationArgs,
  getSortArgs,
  MAX_LIMIT,
} from '../src/common/utils/pagination';

describe('pagination', () => {
  it('falls back to defaults', () => {
    expect(getPaginationArgs()).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it('computes skip from page and limit', () => {
    expect(getPaginationArgs({ page: 3, limit: 10 })).toMatchObject({ skip: 20, take: 10 });
  });

  it('clamps limit to MAX_LIMIT', () => {
    expect(getPaginationArgs({ limit: 5000 }).take).toBe(MAX_LIMIT);
  });

  it('only sorts by allow-listed columns', () => {
    const allowed = ['createdAt', 'name'] as const;
    expect(getSortArgs({ sortBy: 'password', sortOrder: 'asc' }, allowed, 'createdAt')).toEqual({
      createdAt: 'asc',
    });
    expect(getSortArgs({ sortBy: 'name', sortOrder: 'asc' }, allowed, 'createdAt')).toEqual({
      name: 'asc',
    });
  });

  it('builds page metadata', () => {
    const meta = buildPaginationMeta(45, getPaginationArgs({ page: 2, limit: 20 }));
    expect(meta.pagination).toMatchObject({
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
