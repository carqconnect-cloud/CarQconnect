import { z } from 'zod';
import { paginationSchema } from '../../../common/validators/common.schema';

export enum TeamStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export const listTeamsSchema = paginationSchema.extend({
  status: z.nativeEnum(TeamStatus).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
  headId: z.string().optional(),
  status: z.nativeEnum(TeamStatus).default(TeamStatus.ACTIVE),
  employeeIds: z.array(z.string()).optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export type ListTeamsInput = z.infer<typeof listTeamsSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
