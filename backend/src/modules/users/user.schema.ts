import { z } from 'zod';
import { Role } from '@prisma/client';
import {
  emailSchema,
  paginationSchema,
  passwordSchema,
} from '../../common/validators/common.schema';

export const listUsersSchema = paginationSchema.extend({
  role: z.nativeEnum(Role).optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
});

export const inviteUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  role: z.nativeEnum(Role).default(Role.EXECUTIVE),
  teamId: z.string().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  temporaryPassword: passwordSchema,
});

export const updateMemberSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  teamId: z.string().optional().nullable(),
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().optional().nullable(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().min(6).max(20).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
