import { MembershipStatus, Role } from '@prisma/client';
import { ApiError } from '../../common/utils/apiError';
import { buildPaginationMeta, getPaginationArgs, getSortArgs } from '../../common/utils/pagination';
import { hashPassword } from '../../common/utils/password';
import { prisma } from '../../config/database';
import { userRepository } from './user.repository';
import { auditService } from '../audit/audit.service';
import { emailService } from '../../common/utils/email.service';
import { logger } from '../../config/logger';
import type {
  InviteUserInput,
  ListUsersInput,
  UpdateMemberInput,
  UpdateProfileInput,
} from './user.schema';

const SORTABLE = ['createdAt', 'role', 'status'] as const;

export const userService = {
  async listMembers(organizationId: string, query: ListUsersInput) {
    const pagination = getPaginationArgs(query);
    const orderBy = getSortArgs(query, SORTABLE, 'createdAt');

    const { items, total } = await userRepository.listMembers(organizationId, {
      skip: pagination.skip,
      take: pagination.take,
      orderBy,
      role: query.role,
      status: query.status as MembershipStatus | undefined,
      search: query.search,
    });

    return { items, meta: buildPaginationMeta(total, pagination) };
  },

  async getMember(organizationId: string, membershipId: string) {
    const member = await userRepository.findMemberById(organizationId, membershipId);
    if (!member) throw ApiError.notFound('Member');
    return member;
  },

  async invite(
    organizationId: string,
    invitedById: string,
    input: InviteUserInput,
    ipAddress?: string,
    callerRole?: Role,
  ) {
    if (callerRole === Role.TEAM_HEAD && input.role !== Role.EXECUTIVE) {
      throw ApiError.forbidden('Team Heads can only invite Executive team members');
    }

    const passwordHash = await hashPassword(input.temporaryPassword);

    const membership = await prisma.$transaction(async (tx) => {
      const result = await userRepository.inviteMember(
        {
          organizationId,
          invitedById,
          passwordHash,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          teamId: input.teamId,
          phone: input.phone,
        },
        tx,
      );

      if (result.alreadyMember)
        throw ApiError.conflict('This user is already part of the organization');

      await auditService.record(
        {
          organizationId,
          actorId: invitedById,
          action: 'member.invited',
          entity: 'Member',
          entityId: result.membership.id,
          metadata: {
            email: input.email,
            role: input.role,
            teamId: input.teamId,
            firstName: input.firstName,
            lastName: input.lastName,
          },
          ipAddress,
        },
        tx,
      );

      return result.membership;
    });

    // Send credentials email to the new user's email address
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });

      const emailResult = await emailService.sendUserCredentialsEmail({
        to: input.email,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        temporaryPassword: input.temporaryPassword,
        role: input.role,
        organizationName: org?.name || 'Fioner CRM',
      });

      logger.info({ email: input.email, emailResult }, '[UserService] Credentials email dispatched to new user');
    } catch (err: any) {
      logger.error({ err: err?.message, email: input.email }, '[UserService] Error sending credentials email');
    }

    return membership;
  },

  async updateMember(
    organizationId: string,
    membershipId: string,
    input: UpdateMemberInput,
    actorUserId?: string,
    ipAddress?: string,
  ) {
    const member = await userRepository.findMemberById(organizationId, membershipId);
    if (!member) throw ApiError.notFound('Member');

    // Never let the last owner be demoted or suspended — it would orphan the org.
    const demotingOwner = member.role === Role.OWNER && input.role && input.role !== Role.OWNER;
    const suspendingOwner = member.role === Role.OWNER && input.status === 'SUSPENDED';
    if (demotingOwner || suspendingOwner) {
      const owners = await userRepository.countOwners(organizationId);
      if (owners <= 1) throw ApiError.badRequest('An organization must keep at least one owner');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await userRepository.updateMember(
        organizationId,
        membershipId,
        {
          ...(input.role ? { role: input.role } : {}),
          ...(input.status ? { status: input.status as MembershipStatus } : {}),
          ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
        },
        tx,
      );

      await auditService.record(
        {
          organizationId,
          actorId: actorUserId,
          action: 'member.updated',
          entity: 'Member',
          entityId: membershipId,
          metadata: {
            previousRole: member.role,
            newRole: input.role ?? member.role,
            previousStatus: member.status,
            newStatus: input.status ?? member.status,
            teamId: input.teamId !== undefined ? input.teamId : member.teamId,
          },
          ipAddress,
        },
        tx,
      );

      return updated;
    });
  },

  async removeMember(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const member = await userRepository.findMemberById(organizationId, membershipId);
    if (!member) throw ApiError.notFound('Member');
    if (member.userId === actorUserId) throw ApiError.badRequest('You cannot remove yourself');

    if (member.role === Role.OWNER) {
      const owners = await userRepository.countOwners(organizationId);
      if (owners <= 1) throw ApiError.badRequest('An organization must keep at least one owner');
    }

    await prisma.$transaction(async (tx) => {
      await userRepository.removeMember(organizationId, membershipId, tx);

      await auditService.record(
        {
          organizationId,
          actorId: actorUserId,
          action: 'member.removed',
          entity: 'Member',
          entityId: membershipId,
          metadata: {
            removedUserId: member.userId,
            role: member.role,
          },
          ipAddress,
        },
        tx,
      );
    });
  },

  updateProfile(userId: string, input: UpdateProfileInput) {
    return userRepository.updateProfile(userId, input);
  },
};
