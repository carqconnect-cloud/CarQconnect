import { z } from 'zod';

export const PERM_MODULES = [
  'Users',
  'Vehicles',
  'QR',
  'GPS',
  'Orders',
  'Inventory',
  'Membership',
  'SOS',
  'Support',
  'AI',
  'CRM',
  'Content',
  'Reports',
  'Settings',
] as const;

export type PermModule = (typeof PERM_MODULES)[number];

export const PERM_ACTIONS = ['view', 'edit', 'delete'] as const;
export type PermAction = (typeof PERM_ACTIONS)[number];

export const updateRolePermissionsSchema = z.object({
  // Can supply a full or partial perms dictionary
  perms: z
    .record(
      z.string(),
      z.array(z.enum(PERM_ACTIONS)),
    )
    .optional(),
  // Or toggle a single module permission
  module: z.string().optional(),
  perm: z.enum(PERM_ACTIONS).optional(),
  enabled: z.boolean().optional(),
}).refine(
  (data) => data.perms !== undefined || (data.module !== undefined && data.perm !== undefined),
  { message: "Must provide either 'perms' map or 'module' and 'perm' fields" },
);

export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;

export const roleIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Role ID is required'),
});

export type RoleIdParamInput = z.infer<typeof roleIdParamSchema>;
