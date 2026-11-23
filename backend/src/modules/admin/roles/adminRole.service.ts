import { ApiError } from '../../../common/utils/apiError';
import { auditService } from '../../audit/audit.service';
import { adminRoleRepository, type PlatformRole } from './adminRole.repository';
import {
  PERM_ACTIONS,
  PERM_MODULES,
  type PermAction,
  type UpdateRolePermissionsInput,
} from './adminRole.schema';

export const adminRoleService = {
  async getRoles() {
    const roles = await adminRoleRepository.getAll();
    return {
      roles,
      total: roles.length,
    };
  },

  async updatePermissions(
    roleId: string,
    input: UpdateRolePermissionsInput,
    actorId?: string,
    ipAddress?: string,
  ): Promise<PlatformRole> {
    // 1. Super Admin role immutability invariant
    if (roleId === 'role_1') {
      throw ApiError.badRequest(
        'Super Admin permissions are immutable and cannot be modified.',
      );
    }

    // 2. Upfront validation of modules and actions
    if (input.module) {
      if (!PERM_MODULES.includes(input.module as any)) {
        throw ApiError.badRequest(`Unknown module '${input.module}'`);
      }
    }
    if (input.perm) {
      if (!PERM_ACTIONS.includes(input.perm)) {
        throw ApiError.badRequest(`Invalid permission action '${input.perm}'`);
      }
    }

    if (input.perms) {
      for (const [mod, actions] of Object.entries(input.perms)) {
        if (!PERM_MODULES.includes(mod as any)) {
          throw ApiError.badRequest(`Unknown module '${mod}'`);
        }
        if (!Array.isArray(actions)) {
          throw ApiError.badRequest(`Permissions for module '${mod}' must be an array of actions`);
        }

        for (const action of actions) {
          if (!PERM_ACTIONS.includes(action as PermAction)) {
            throw ApiError.badRequest(
              `Invalid permission action '${action}' for module '${mod}'`,
            );
          }
        }
      }
    }

    const updatedModuleNames: string[] = [];

    // 3. Concurrency-safe atomic update with audit logging inside the transaction
    const saved = await adminRoleRepository.updateRoleAtomic(
      roleId,
      (currentPerms) => {
        // Case 1: Direct single permission toggle
        if (input.module && input.perm) {
          const mod = input.module;
          const perm = input.perm;
          const isEnabled = input.enabled ?? true;

          const modPerms = new Set(currentPerms[mod] || []);
          if (isEnabled) {
            modPerms.add(perm);
          } else {
            modPerms.delete(perm);
          }

          currentPerms[mod] = Array.from(modPerms);
          updatedModuleNames.push(mod);
        }

        // Case 2: Dictionary of module permissions
        if (input.perms) {
          for (const [mod, actions] of Object.entries(input.perms)) {
            currentPerms[mod] = Array.from(new Set(actions));
            updatedModuleNames.push(mod);
          }
        }

        return currentPerms;
      },
      async (updatedRole, tx) => {
        // Persist audit event in the same transaction
        await auditService.record(
          {
            action: 'admin_role.permissions_updated',
            entity: 'PlatformRole',
            entityId: updatedRole.id,
            actorId: actorId || null,
            ipAddress: ipAddress || null,
            metadata: {
              roleId: updatedRole.id,
              roleName: updatedRole.name,
              updatedModules: updatedModuleNames,
              version: updatedRole.version,
            },
          },
          tx,
        );
      },
    );

    return saved;
  },
};
