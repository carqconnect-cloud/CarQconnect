import { MembershipStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/database';

/**
 * Data access for auth. No business rules here — only queries.
 */
export const authRepository = {
  async findUserByEmail(email: string) {
    const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
    if (superAdmin) {
      return {
        ...superAdmin,
        avatarUrl: null,
        isSuperAdmin: true,
        isSubSuperAdmin: false,
        isCrmUser: false,
      };
    }

    const subSuperAdmin = await prisma.subSuperAdmin.findUnique({ where: { email } });
    if (subSuperAdmin) {
      return {
        ...subSuperAdmin,
        avatarUrl: null,
        isSuperAdmin: false,
        isSubSuperAdmin: true,
        isCrmUser: false,
      };
    }

    const crmUser = await prisma.crmUser.findUnique({ where: { email } });
    if (crmUser) return { ...crmUser, avatarUrl: null, isSuperAdmin: false, isSubSuperAdmin: false, isCrmUser: true };

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return { ...user, isSubSuperAdmin: false, isCrmUser: false };

    return null;
  },

  async findUserCandidateByEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    const cleanPhone = email.replace(/[\s\-\(\)]/g, '');
    const isPhoneLike = /^\+?[0-9]{7,15}$/.test(cleanPhone);

    const filter = isPhoneLike
      ? {
          OR: [
            { email: normalized },
            { phone: cleanPhone },
            { phone: email.trim() },
            ...(cleanPhone.startsWith('+') ? [{ phone: cleanPhone.substring(1) }] : [{ phone: `+${cleanPhone}` }]),
            ...(cleanPhone.length === 10 ? [{ phone: `+91${cleanPhone}` }] : []),
            ...(cleanPhone.startsWith('91') && cleanPhone.length === 12 ? [{ phone: cleanPhone.substring(2) }] : []),
          ],
        }
      : { email: normalized };

    const [superAdmin, subSuperAdmin, crmUser, user] = await Promise.all([
      prisma.superAdmin.findFirst({ where: filter }),
      prisma.subSuperAdmin.findFirst({ where: filter }),
      prisma.crmUser.findFirst({ where: filter }),
      prisma.user.findFirst({ where: filter }),
    ]);

    return {
      superAdmin: superAdmin
        ? { ...superAdmin, avatarUrl: null, isSuperAdmin: true, isSubSuperAdmin: false, isCrmUser: false }
        : null,
      subSuperAdmin: subSuperAdmin
        ? { ...subSuperAdmin, avatarUrl: null, isSuperAdmin: false, isSubSuperAdmin: true, isCrmUser: false }
        : null,
      crmUser: crmUser
        ? { ...crmUser, avatarUrl: null, isSuperAdmin: false, isSubSuperAdmin: false, isCrmUser: true }
        : null,
      user: user
        ? { ...user, isSubSuperAdmin: false, isCrmUser: false }
        : null,
    };
  },

  async findSuperAdminCandidate(email: string) {
    const [superAdmin, subSuperAdmin] = await Promise.all([
      prisma.superAdmin.findUnique({ where: { email } }),
      prisma.subSuperAdmin.findUnique({ where: { email } }),
    ]);
    if (superAdmin) {
      return { ...superAdmin, avatarUrl: null, isSuperAdmin: true, isSubSuperAdmin: false, isCrmUser: false };
    }
    if (subSuperAdmin) {
      return { ...subSuperAdmin, avatarUrl: null, isSuperAdmin: false, isSubSuperAdmin: true, isCrmUser: false };
    }
    return null;
  },

  async findCrmUserCandidate(email: string) {
    const crmUser = await prisma.crmUser.findUnique({ where: { email } });
    return crmUser ? { ...crmUser, avatarUrl: null, isSuperAdmin: false, isSubSuperAdmin: false, isCrmUser: true } : null;
  },

  async findAppUserCandidate(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? { ...user, isSubSuperAdmin: false, isCrmUser: false } : null;
  },

  async findUserById(id: string) {
    const superAdmin = await prisma.superAdmin.findUnique({ where: { id } });
    if (superAdmin) {
      return {
        ...superAdmin,
        avatarUrl: null,
        isSuperAdmin: true,
        isSubSuperAdmin: false,
        isCrmUser: false,
      };
    }

    const subSuperAdmin = await prisma.subSuperAdmin.findUnique({ where: { id } });
    if (subSuperAdmin) {
      return {
        ...subSuperAdmin,
        avatarUrl: null,
        isSuperAdmin: false,
        isSubSuperAdmin: true,
        isCrmUser: false,
      };
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return { ...user, isSubSuperAdmin: false, isCrmUser: false };

    const crmUser = await prisma.crmUser.findUnique({ where: { id } });
    if (crmUser) return { ...crmUser, avatarUrl: null, isSuperAdmin: false, isSubSuperAdmin: false, isCrmUser: true };

    return null;
  },

  async findMemberships(userId: string) {
    const crmUser = await prisma.crmUser.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
    if (crmUser) {
      return [
        {
          userId: crmUser.id,
          organizationId: crmUser.organizationId,
          role: crmUser.role,
          status: crmUser.status,
          isDefault: true,
          invitedById: null,
          teamId: crmUser.teamId,
          createdAt: crmUser.createdAt,
          updatedAt: crmUser.updatedAt,
          organization: crmUser.organization,
        },
      ];
    }

    return prisma.membership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        organization: { isActive: true },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  },

  findInvitedMembership(userId: string) {
    return prisma.membership.findFirst({
      where: { userId, status: MembershipStatus.INVITED, organization: { isActive: true } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  },

  async findMembership(userId: string, organizationId: string) {
    const crmUser = await prisma.crmUser.findUnique({ where: { id: userId } });
    if (crmUser && crmUser.organizationId === organizationId) {
      return {
        id: crmUser.id,
        userId: crmUser.id,
        organizationId: crmUser.organizationId,
        role: crmUser.role,
        status: crmUser.status,
      } as any;
    }
    return prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  },

  activateMembership(id: string) {
    return prisma.membership.update({
      where: { id },
      data: { status: MembershipStatus.ACTIVE },
    });
  },

  createUserWithOrganization(input: {
    user: Prisma.UserCreateInput;
    organizationName: string;
    slug: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: input.user });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.slug,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: Role.OWNER,
          status: MembershipStatus.ACTIVE,
          isDefault: true,
        },
      });

      return { user, organization, membership };
    });
  },

  createCrmUserWithOrganization(input: {
    crmUser: Omit<Prisma.CrmUserCreateInput, 'organization'>;
    organizationName: string;
    slug: string;
  }) {
    return prisma.$transaction(async (tx) => {
      let organization = await tx.organization.findUnique({ where: { slug: input.slug } });
      if (!organization) {
        organization = await tx.organization.create({
          data: { name: input.organizationName, slug: input.slug },
        });
      }

      const crmUser = await tx.crmUser.create({
        data: {
          ...input.crmUser,
          organization: { connect: { id: organization.id } },
        },
      });

      return { crmUser, organization };
    });
  },

  createSuperAdmin(data: Prisma.SuperAdminCreateInput) {
    return prisma.superAdmin.create({ data });
  },

  createSubSuperAdmin(data: Prisma.SubSuperAdminCreateInput) {
    return prisma.subSuperAdmin.create({ data });
  },

  listSubSuperAdmins() {
    return prisma.subSuperAdmin.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  slugExists(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
  },

  async updateUser(id: string, data: Prisma.UserUpdateInput | any, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    const superAdmin = await client.superAdmin.findUnique({ where: { id } });
    if (superAdmin) {
      return client.superAdmin.update({ where: { id }, data });
    }
    const subSuperAdmin = await client.subSuperAdmin.findUnique({ where: { id } });
    if (subSuperAdmin) {
      return client.subSuperAdmin.update({ where: { id }, data });
    }
    const crmUser = await client.crmUser.findUnique({ where: { id } });
    if (crmUser) {
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.passwordHash) updateData.passwordHash = data.passwordHash;
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.phone) updateData.phone = data.phone;
      if (data.role) updateData.role = data.role;
      if (Object.keys(updateData).length > 0) {
        return client.crmUser.update({ where: { id }, data: updateData });
      }
      return crmUser;
    }
    return client.user.update({
      where: { id },
      data,
    });
  },

  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true, crmUser: true, superAdmin: true, subSuperAdmin: true },
    });
  },

  revokeRefreshToken(id: string, replacedById?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        replacedById,
      },
    });
  },

  revokeAllUserTokens(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.refreshToken.updateMany({
      where: {
        OR: [
          { userId },
          { crmUserId: userId },
          { superAdminId: userId },
          { subSuperAdminId: userId },
        ],
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  },
};

export type AuthRepository = typeof authRepository;
