export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export type Nullable<T> = T | null;

/** Narrow a value to itself but assert it is defined (for strict index access). */
export function assertDefined<T>(value: T | undefined | null, message = 'Value is required'): T {
  if (value === undefined || value === null) throw new Error(message);
  return value;
}
