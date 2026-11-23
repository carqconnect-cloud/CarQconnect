import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/config/database';
import { auditService, sanitizeAuditMetadata } from '../src/modules/audit/audit.service';
import { leadService } from '../src/modules/crm/leads/lead.service';
import { leadController } from '../src/modules/crm/leads/lead.controller';
import * as leadRepoModule from '../src/modules/crm/leads/lead.repository';
import { userService } from '../src/modules/users/user.service';
import { userController } from '../src/modules/users/user.controller';
import { userRepository } from '../src/modules/users/user.repository';
import { organizationService } from '../src/modules/organization/organization.service';
import { organizationController } from '../src/modules/organization/organization.controller';
import { customerService } from '../src/modules/crm/customers/customer.service';
import { customerController } from '../src/modules/crm/customers/customer.controller';
import { customerRepository } from '../src/modules/crm/customers/customer.repository';
import { teamService } from '../src/modules/crm/teams/team.service';
import { teamController } from '../src/modules/crm/teams/team.controller';
import * as teamRepoModule from '../src/modules/crm/teams/team.repository';
import { authService } from '../src/modules/auth/auth.service';
import { authController } from '../src/modules/auth/auth.controller';
import { Role, MembershipStatus } from '@prisma/client';

describe('Audit Logging Module (src/modules/audit)', () => {
  const orgId = 'org_audit_test_1';
  const actorId = 'user_audit_actor_1';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: unknown) => {
      if (typeof cb === 'function') {
        return (cb as (tx: unknown) => unknown)(prisma);
      }
      return Promise.all(cb as Array<Promise<unknown>>);
    });
  });

  // =========================================================================
  // 1. Metadata Sanitization & Credential Protection
  // =========================================================================
  describe('Metadata Sanitization & Sensitive Data Stripping', () => {
    it('strips password, token, hash, secret, and authorization headers from audit metadata', () => {
      const dirty = {
        email: 'user@example.com',
        role: 'ADMIN',
        password: 'PlainTextPassword123!',
        temporaryPassword: 'TempPassword456!',
        passwordHash: '$2b$12$somehashhere',
        refreshToken: 'rt_secret_token_123',
        secretKey: 'sk_live_verysecret',
        authorization: 'Bearer jwt.token.here',
        apiKey: 'key_123',
        nested: {
          safeKey: 'safe-value',
          userPassword: 'nested_password',
        },
      };

      const sanitized = sanitizeAuditMetadata(dirty);

      expect(sanitized).not.toBeNull();
      expect(sanitized?.email).toBe('user@example.com');
      expect(sanitized?.role).toBe('ADMIN');
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('temporaryPassword');
      expect(sanitized).not.toHaveProperty('passwordHash');
      expect(sanitized).not.toHaveProperty('refreshToken');
      expect(sanitized).not.toHaveProperty('secretKey');
      expect(sanitized).not.toHaveProperty('authorization');
      expect(sanitized).not.toHaveProperty('apiKey');
      expect((sanitized?.nested as Record<string, unknown>).safeKey).toBe('safe-value');
      expect((sanitized?.nested as Record<string, unknown>)).not.toHaveProperty('userPassword');
    });

    it('returns null when metadata is null or undefined', () => {
      expect(sanitizeAuditMetadata(null)).toBeNull();
      expect(sanitizeAuditMetadata(undefined)).toBeNull();
    });

    it('recursively sanitizes sensitive keys within arrays of objects', () => {
      const dataWithArray = {
        items: [
          { id: '1', token: 'secret-token-1', name: 'Alpha' },
          { id: '2', apiKey: 'secret-key-2', name: 'Beta' },
        ],
        primitiveArray: [1, 2, 'three'],
        nestedArrays: [
          [{ password: 'p1', label: 'inner' }],
        ],
      };

      const sanitized = sanitizeAuditMetadata(dataWithArray);
      expect(sanitized).not.toBeNull();
      const items = sanitized?.items as Array<Record<string, unknown>>;
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ id: '1', name: 'Alpha' });
      expect(items[0]).not.toHaveProperty('token');
      expect(items[1]).toEqual({ id: '2', name: 'Beta' });
      expect(items[1]).not.toHaveProperty('apiKey');
      expect(sanitized?.primitiveArray).toEqual([1, 2, 'three']);
      const nested = sanitized?.nestedArrays as Array<Array<Record<string, unknown>>>;
      expect(nested[0]![0]).toEqual({ label: 'inner' });
      expect(nested[0]![0]).not.toHaveProperty('password');
    });

    it('handles primitive, non-object, and top-level array metadata safely by returning null', () => {
      expect(sanitizeAuditMetadata('primitive string' as never)).toBeNull();
      expect(sanitizeAuditMetadata(123 as never)).toBeNull();
      expect(sanitizeAuditMetadata([1, 2, 3] as never)).toBeNull();
    });
  });

  // =========================================================================
  // 2. AuditService.record
  // =========================================================================
  describe('auditService.record', () => {
    it('creates an AuditLog record with sanitized metadata and explicit attribution', async () => {
      const mockEntry = {
        id: 'audit_log_1',
        organizationId: orgId,
        actorId,
        action: 'lead.deleted',
        entity: 'Lead',
        entityId: 'lead_123',
        metadata: { name: 'Acme Deal' },
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
      };

      const createSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce(mockEntry as never);

      const result = await auditService.record({
        organizationId: orgId,
        actorId,
        action: 'lead.deleted',
        entity: 'Lead',
        entityId: 'lead_123',
        metadata: { name: 'Acme Deal', password: 'should-be-stripped' },
        ipAddress: '192.168.1.1',
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'lead.deleted',
          entity: 'Lead',
          entityId: 'lead_123',
          metadata: { name: 'Acme Deal' },
          ipAddress: '192.168.1.1',
        }),
      });
      expect(result.id).toBe('audit_log_1');
    });

    it('propagates error when audit persistence fails', async () => {
      vi.spyOn(prisma.auditLog, 'create').mockRejectedValueOnce(new Error('DB Connection Lost'));

      await expect(
        auditService.record({
          organizationId: orgId,
          actorId,
          action: 'member.removed',
          entity: 'Member',
        }),
      ).rejects.toThrow('DB Connection Lost');
    });
  });

  // =========================================================================
  // 3. Destructive & Privileged Action Integration
  // =========================================================================
  describe('Service Integrations on Privileged & Destructive Actions', () => {
    it('records lead.deleted audit log when leadService.remove executes', async () => {
      const mockLead = {
        id: 'lead_to_delete',
        organizationId: orgId,
        name: 'Deal Alpha',
        status: 'NEW',
      };

      vi.spyOn(leadRepoModule, 'leadRepository').mockReturnValue({
        findById: vi.fn().mockResolvedValue(mockLead),
        delete: vi.fn().mockResolvedValue(mockLead),
      } as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await leadService.remove(orgId, 'lead_to_delete', actorId, '127.0.0.1');

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'lead.deleted',
          entity: 'Lead',
          entityId: 'lead_to_delete',
          metadata: { name: 'Deal Alpha', status: 'NEW' },
          ipAddress: '127.0.0.1',
        }),
        expect.anything(),
      );
    });

    it('does NOT record lead.deleted audit log if lead does not exist (not found)', async () => {
      vi.spyOn(leadRepoModule, 'leadRepository').mockReturnValue({
        findById: vi.fn().mockResolvedValue(null),
      } as never);
      const auditSpy = vi.spyOn(auditService, 'record');

      await expect(leadService.remove(orgId, 'nonexistent_lead', actorId)).rejects.toThrow();
      expect(auditSpy).not.toHaveBeenCalled();
    });

    it('records member.invited audit log when userService.invite executes without leaking temp password', async () => {
      vi.spyOn(userRepository, 'inviteMember').mockResolvedValueOnce({
        alreadyMember: false,
        membership: {
          id: 'mem_new_123',
          organizationId: orgId,
          userId: 'user_invited_1',
          role: Role.EXECUTIVE,
        },
      } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await userService.invite(orgId, actorId, {
        email: 'invited@test.com',
        firstName: 'Rohit',
        lastName: 'Sharma',
        role: Role.EXECUTIVE,
        temporaryPassword: 'TempSecretPassword99!',
      });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'member.invited',
          entity: 'Member',
          entityId: 'mem_new_123',
          metadata: {
            email: 'invited@test.com',
            role: Role.EXECUTIVE,
            teamId: undefined,
            firstName: 'Rohit',
            lastName: 'Sharma',
          },
        }),
        expect.anything(),
      );
    });

    it('records member.updated audit log when userService.updateMember executes', async () => {
      const existingMember = {
        id: 'mem_existing',
        userId: 'user_target',
        role: Role.EXECUTIVE,
        status: MembershipStatus.ACTIVE,
        teamId: null,
      };

      vi.spyOn(userRepository, 'findMemberById').mockResolvedValueOnce(existingMember as never);
      vi.spyOn(userRepository, 'updateMember').mockResolvedValueOnce({
        ...existingMember,
        role: Role.ADMIN,
        status: MembershipStatus.ACTIVE,
      } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await userService.updateMember(orgId, 'mem_existing', { role: Role.ADMIN }, actorId);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'member.updated',
          entity: 'Member',
          entityId: 'mem_existing',
          metadata: {
            previousRole: Role.EXECUTIVE,
            newRole: Role.ADMIN,
            previousStatus: MembershipStatus.ACTIVE,
            newStatus: MembershipStatus.ACTIVE,
            teamId: null,
          },
        }),
        expect.anything(),
      );
    });

    it('records member.removed audit log when userService.removeMember executes', async () => {
      const existingMember = {
        id: 'mem_to_remove',
        userId: 'user_other',
        role: Role.EXECUTIVE,
      };

      vi.spyOn(userRepository, 'findMemberById').mockResolvedValueOnce(existingMember as never);
      vi.spyOn(userRepository, 'removeMember').mockResolvedValueOnce({} as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await userService.removeMember(orgId, 'mem_to_remove', actorId);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'member.removed',
          entity: 'Member',
          entityId: 'mem_to_remove',
          metadata: {
            removedUserId: 'user_other',
            role: Role.EXECUTIVE,
          },
        }),
        expect.anything(),
      );
    });

    it('records organization.updated audit log when organizationService.update executes', async () => {
      vi.spyOn(prisma.organization, 'update').mockResolvedValueOnce({
        id: orgId,
        name: 'Updated Org Name',
      } as never);

      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await organizationService.update(orgId, { name: 'Updated Org Name' }, actorId);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'organization.updated',
          entity: 'Organization',
          entityId: orgId,
          metadata: { name: 'Updated Org Name' },
        }),
        expect.anything(),
      );
    });

    it('records customer.deleted audit log when customerService.remove executes', async () => {
      const existingCustomer = {
        id: 'cust_to_delete',
        organizationId: orgId,
        name: 'Pooja Patel',
      };

      vi.spyOn(customerRepository, 'findById').mockResolvedValueOnce(existingCustomer as never);
      vi.spyOn(customerRepository, 'delete').mockResolvedValueOnce(existingCustomer as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await customerService.remove(orgId, 'cust_to_delete', actorId);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'customer.deleted',
          entity: 'Customer',
          entityId: 'cust_to_delete',
          metadata: { name: 'Pooja Patel' },
        }),
        expect.anything(),
      );
    });

    it('records team.deleted audit log when teamService.remove executes', async () => {
      const existingTeam = {
        id: 'team_to_delete',
        organizationId: orgId,
        name: 'Enterprise Deals Team',
      };

      vi.spyOn(teamRepoModule, 'teamRepository').mockReturnValue({
        findById: vi.fn().mockResolvedValue(existingTeam),
        delete: vi.fn().mockResolvedValue(existingTeam),
      } as never);
      const auditSpy = vi.spyOn(auditService, 'record').mockResolvedValueOnce({} as never);

      await teamService.remove(orgId, 'team_to_delete', actorId);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'team.deleted',
          entity: 'Team',
          entityId: 'team_to_delete',
          metadata: { name: 'Enterprise Deals Team' },
        }),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // 4. Audit Log Querying & Tenant Isolation
  // =========================================================================
  describe('auditService.list and auditService.getById Isolation', () => {
    it('scopes audit log listing strictly to organizationId', async () => {
      const findSpy = vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValueOnce([]);
      const countSpy = vi.spyOn(prisma.auditLog, 'count').mockResolvedValueOnce(0);

      await auditService.list(orgId, { entity: 'Lead', action: 'lead.deleted' });

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: orgId,
            entity: 'Lead',
            action: 'lead.deleted',
          },
        }),
      );
      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: orgId,
            entity: 'Lead',
            action: 'lead.deleted',
          },
        }),
      );
    });

    it('enforces organizationId scoping on auditService.getById', async () => {
      const findFirstSpy = vi.spyOn(prisma.auditLog, 'findFirst').mockResolvedValueOnce(null);

      await auditService.getById('audit_entry_123', orgId);

      expect(findFirstSpy).toHaveBeenCalledWith({
        where: {
          id: 'audit_entry_123',
          organizationId: orgId,
        },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  });

  // =========================================================================
  // 5. Controller Actor Identity & Tenant Attribution
  // =========================================================================
  describe('Controller Actor Identity & Tenant Context Attribution', () => {
    it('leadController.remove derives actorId from req.auth.userId and organizationId from req.tenant.organizationId', async () => {
      const removeSpy = vi.spyOn(leadService, 'remove').mockResolvedValueOnce(undefined);
      const req = {
        auth: { userId: 'actor_lead_user' },
        tenant: { organizationId: 'tenant_org_123' },
        params: { id: 'lead_target_1' },
        ip: '10.0.0.5',
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await leadController.remove(req, res);

      expect(removeSpy).toHaveBeenCalledWith(
        'tenant_org_123',
        'lead_target_1',
        'actor_lead_user',
        '10.0.0.5',
      );
    });

    it('customerController.remove derives actorId from req.auth.userId and organizationId from req.tenant.organizationId', async () => {
      const removeSpy = vi.spyOn(customerService, 'remove').mockResolvedValueOnce(undefined);
      const req = {
        auth: { userId: 'actor_cust_user' },
        tenant: { organizationId: 'tenant_org_456' },
        params: { id: 'cust_target_2' },
        ip: '10.0.0.6',
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await customerController.remove(req, res);

      expect(removeSpy).toHaveBeenCalledWith(
        'tenant_org_456',
        'cust_target_2',
        'actor_cust_user',
        '10.0.0.6',
      );
    });

    it('teamController.remove derives actorId from req.auth.userId and organizationId from req.tenant.organizationId', async () => {
      const removeSpy = vi.spyOn(teamService, 'remove').mockResolvedValueOnce(undefined);
      const req = {
        auth: { userId: 'actor_team_user' },
        tenant: { organizationId: 'tenant_org_789' },
        params: { id: 'team_target_3' },
        ip: '10.0.0.7',
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await teamController.remove(req, res);

      expect(removeSpy).toHaveBeenCalledWith(
        'tenant_org_789',
        'team_target_3',
        'actor_team_user',
        '10.0.0.7',
      );
    });

    it('organizationController.update derives actorId from req.auth.userId and organizationId from req.tenant.organizationId', async () => {
      const updateSpy = vi.spyOn(organizationService, 'update').mockResolvedValueOnce({} as never);
      const req = {
        auth: { userId: 'actor_org_user' },
        tenant: { organizationId: 'tenant_org_999' },
        body: { name: 'Renamed Org' },
        ip: '10.0.0.8',
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await organizationController.update(req, res);

      expect(updateSpy).toHaveBeenCalledWith(
        'tenant_org_999',
        { name: 'Renamed Org' },
        'actor_org_user',
        '10.0.0.8',
      );
    });

    it('userController.remove derives actorId from req.auth.userId and organizationId from req.tenant.organizationId', async () => {
      const removeSpy = vi.spyOn(userService, 'removeMember').mockResolvedValueOnce(undefined);
      const req = {
        auth: { userId: 'actor_admin_user' },
        tenant: { organizationId: 'tenant_org_111' },
        params: { id: 'membership_to_remove' },
        ip: '10.0.0.9',
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await userController.remove(req, res);

      expect(removeSpy).toHaveBeenCalledWith(
        'tenant_org_111',
        'membership_to_remove',
        'actor_admin_user',
        '10.0.0.9',
      );
    });

    it('authController.changePassword derives actorId strictly from req.auth.userId', async () => {
      const changePassSpy = vi.spyOn(authService, 'changePassword').mockResolvedValueOnce(undefined);
      const req = {
        auth: { userId: 'actor_self_user' },
        body: { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' },
        ip: '10.0.0.10',
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await authController.changePassword(req, res);

      expect(changePassSpy).toHaveBeenCalledWith(
        'actor_self_user',
        { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' },
        '10.0.0.10',
      );
    });
  });
});
