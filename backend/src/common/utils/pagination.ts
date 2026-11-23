export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationArgs {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function getPaginationArgs(query: PaginationQuery = {}): PaginationArgs {
  const page = Math.max(DEFAULT_PAGE, Math.trunc(query.page ?? DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(query.limit ?? DEFAULT_LIMIT)));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/**
 * Builds an orderBy object, but only for columns you explicitly allow —
 * never pass raw user input straight into Prisma's orderBy.
 */
export function getSortArgs<T extends string>(
  query: PaginationQuery,
  allowed: readonly T[],
  fallback: T,
): Record<string, 'asc' | 'desc'> {
  const field = (allowed as readonly string[]).includes(query.sortBy ?? '')
    ? (query.sortBy as T)
    : fallback;
  return { [field]: query.sortOrder === 'asc' ? 'asc' : 'desc' };
}

export function buildPaginationMeta(total: number, { page, limit }: PaginationArgs) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
