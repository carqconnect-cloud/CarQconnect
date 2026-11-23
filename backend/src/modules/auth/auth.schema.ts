import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../common/validators/common.schema';

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(6).max(20).optional(),
  organizationName: z.string().trim().min(2).max(120),
  role: z.enum(['OWNER', 'ADMIN', 'TEAM_HEAD', 'EXECUTIVE', 'VIEWER']).optional(),
});

export const adminRegisterSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(60),
    lastName: z.string().trim().min(1, 'Last name is required').max(60),
    email: emailSchema,
    phone: z.string().trim().min(6).max(20).optional().nullable().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    securityKey: z.string().min(1, 'Security passcode / Master secret key is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const subAdminCreateSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(60),
    lastName: z.string().trim().min(1, 'Last name is required').max(60),
    email: emailSchema,
    phone: z.string().trim().min(6).max(20).optional().nullable().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    roleTitle: z.string().trim().min(2).max(60).optional(),
    permissions: z.any().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email or phone number is required'),
  password: z.string().min(1, 'Password is required'),
  organizationId: z.string().optional(),
  portal: z.enum(['super-admin', 'crm', 'app']).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});

export const googleLoginSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  photoUrl: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type SubAdminCreateInput = z.infer<typeof subAdminCreateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;
