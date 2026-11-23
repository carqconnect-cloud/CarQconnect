import { MembershipStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/database';

function toMemberDto(crmUser: any) {
  return {
    ...crmUser,
    userId: crmUser.id,
    user: {
      id: crmUser.id,
      email: crmUser.email,
      firstName: crmUser.firstName,
      lastName: crmUser.lastName,
      phone: crmUser.phone,
      avatarUrl: null,
      isActive: crmUser.status === MembershipStatus.ACTIVE,
    },
    team: crmUser.teamId ? { id: crmUser.teamId, name: '' } : null,
  };
}

export const userRepository = {
  async listMembers(
    organizationId: string,
    args: {
      skip: number;
      take: number;
      orderBy: Record<string, 'asc' | 'desc'>;
      role?: Role;
      status?: MembershipStatus;
      search?: string;
    },
  ) {
    const where: Prisma.CrmUserWhereInput = {
      organizationId,
      ...(args.role ? { role: args.role } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.search
        ? {
            OR: [
              { firstName: { contains: args.search, mode: 'insensitive' } },
              { lastName: { contains: args.search, mode: 'insensitive' } },
              { email: { contains: args.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.crmUser.findMany({
        where,
        skip: args.skip,
        take: args.take,
        orderBy: args.orderBy,
      }),
      prisma.crmUser.count({ where }),
    ]);

    return {
      items: items.map(toMemberDto),
      total,
    };
  },

  async findMemberById(organizationId: string, membershipId: string) {
    const crmUser = await prisma.crmUser.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
    });
    if (!crmUser) return null;
    return toMemberDto(crmUser);
  },

  async findMemberByUserId(organizationId: string, userId: string) {
    return this.findMemberById(organizationId, userId);
  },

  async updateMember(
    _organizationId: string,
    membershipId: string,
    data: {
      role?: Role;
      status?: MembershipStatus;
      teamId?: string | null;
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    },
    clientTx?: Prisma.TransactionClient,
  ) {
    const client = clientTx ?? prisma;
    const updateData: Prisma.CrmUserUpdateInput = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.teamId !== undefined) updateData.teamId = data.teamId;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;

    const updated = await client.crmUser.update({
      where: { id: membershipId },
      data: updateData,
    });

    return toMemberDto(updated);
  },

  removeMember(_organizationId: string, membershipId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.crmUser.delete({
      where: { id: membershipId },
    });
  },

  countOwners(organizationId: string) {
    return prisma.crmUser.count({
      where: {
        organizationId,
        role: { in: [Role.OWNER, Role.ADMIN] },
        status: MembershipStatus.ACTIVE,
      },
    });
  },

  updateProfile(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
      },
    });
  },

  async inviteMember(
    input: {
      organizationId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: Role;
      passwordHash: string;
      invitedById: string;
      teamId?: string | null;
      phone?: string | null;
    },
    clientTx?: Prisma.TransactionClient,
  ) {
    const client = clientTx ?? prisma;
    const existing = await client.crmUser.findUnique({
      where: { email: input.email },
    });

    if (existing && existing.organizationId === input.organizationId) {
      return {
        alreadyMember: true as const,
        membership: toMemberDto(existing),
      };
    }

    const crmUser = await client.crmUser.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        passwordHash: input.passwordHash,
        organizationId: input.organizationId,
        role: input.role,
        status: MembershipStatus.INVITED,
        teamId: input.teamId,
      },
    });

    return {
      alreadyMember: false as const,
      membership: toMemberDto(crmUser),
    };
  },
};
