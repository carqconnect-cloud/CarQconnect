import { Role } from '@prisma/client';

export { Role };

/** Higher number = more power. Use for "at least this role" checks. */
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 10,
  EXECUTIVE: 20,
  TEAM_HEAD: 30,
  ADMIN: 40,
  OWNER: 50,
};

export function hasAtLeastRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
