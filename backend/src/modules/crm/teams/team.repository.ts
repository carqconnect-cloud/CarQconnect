import { Prisma } from '@prisma/client';
import { tenantClient } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import type { CreateTeamInput, UpdateTeamInput } from './team.schema';

export function teamRepository(organizationId: string) {
  const db = tenantClient(organizationId);

  async function validateEmployeeMemberships(employeeIds: string[]) {
    if (employeeIds.length === 0) return;

    const memberships = await db.membership.findMany({
      where: {
        organizationId,
        userId: { in: employeeIds },
      },
      select: { userId: true },
    });

    const crmUsers = await db.crmUser.findMany({
      where: {
        organizationId,
        id: { in: employeeIds },
      },
      select: { id: true },
    });

    const foundUserIds = new Set([
      ...memberships.map((m) => m.userId),
      ...crmUsers.map((u) => u.id),
    ]);
    const invalidUserIds = employeeIds.filter((id) => !foundUserIds.has(id));

    if (invalidUserIds.length > 0) {
      throw ApiError.badRequest(
        `One or more employees do not belong to this organization: ${invalidUserIds.join(', ')}`,
      );
    }
  }

  return {
    async list(args: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.TeamOrderByWithRelationInput;
      status?: import('@prisma/client').TeamStatus;
    }) {
      const where: Prisma.TeamWhereInput = {
        ...(args.status && { status: args.status }),
      };

      const [items, total] = await Promise.all([
        db.team.findMany({
          where,
          skip: args.skip,
          take: args.take,
          orderBy: args.orderBy,
          include: {
            head: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            _count: {
              select: { memberships: true },
            },
          },
        }),
        db.team.count({ where }),
      ]);

      const enrichedItems = await Promise.all(
        items.map(async (team) => {
          let head = team.head;
          if (!head && team.headId) {
            const crmHead = await db.crmUser.findUnique({
              where: { id: team.headId },
              select: { id: true, firstName: true, lastName: true, email: true },
            });
            if (crmHead) head = crmHead;
          }
          const crmCount = await db.crmUser.count({
            where: { organizationId, teamId: team.id },
          });
          const totalMembers = (team._count?.memberships || 0) + crmCount;
          return {
            ...team,
            head,
            _count: {
              memberships: totalMembers,
              userTeams: totalMembers,
            },
          };
        }),
      );

      return { items: enrichedItems, total };
    },

    async findById(id: string) {
      const team = await db.team.findFirst({
        where: { id },
        include: {
          head: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { memberships: true },
          },
        },
      });

      if (!team) return null;

      let head = team.head;
      if (!head && team.headId) {
        const crmHead = await db.crmUser.findUnique({
          where: { id: team.headId },
          select: { id: true, firstName: true, lastName: true, email: true },
        });
        if (crmHead) head = crmHead;
      }
      const crmCount = await db.crmUser.count({
        where: { organizationId, teamId: team.id },
      });
      const totalMembers = (team._count?.memberships || 0) + crmCount;

      return {
        ...team,
        head,
        _count: {
          memberships: totalMembers,
          userTeams: totalMembers,
        },
      };
    },

    async create(data: CreateTeamInput) {
      const { employeeIds, ...rest } = data;

      if (employeeIds && employeeIds.length > 0) {
        await validateEmployeeMemberships(employeeIds);
      }

      // Ensure headId actually exists in the users table to prevent foreign key violation
      let safeHeadId = rest.headId;
      if (safeHeadId) {
        const userExists = await db.user.findUnique({
          where: { id: safeHeadId },
          select: { id: true },
        });
        if (!userExists) {
          safeHeadId = undefined;
        }
      }

      return db.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            ...rest,
            headId: safeHeadId,
            organizationId,
          } as Prisma.TeamUncheckedCreateInput,
        });

        if (employeeIds && employeeIds.length > 0) {
          await tx.membership.updateMany({
            where: {
              organizationId,
              userId: { in: employeeIds },
            },
            data: {
              teamId: team.id,
            },
          });
          await tx.crmUser.updateMany({
            where: {
              organizationId,
              id: { in: employeeIds },
            },
            data: {
              teamId: team.id,
            },
          });
        }

        return team;
      });
    },

    async update(id: string, data: UpdateTeamInput) {
      const { employeeIds, ...rest } = data;

      if (employeeIds && employeeIds.length > 0) {
        await validateEmployeeMemberships(employeeIds);
      }

      return db.$transaction(async (tx) => {
        const team = await tx.team.update({
          where: { id },
          data: rest as Prisma.TeamUncheckedUpdateInput,
        });

        if (employeeIds && employeeIds.length > 0) {
          await tx.membership.updateMany({
            where: {
              organizationId,
              userId: { in: employeeIds },
            },
            data: {
              teamId: id,
            },
          });
          await tx.crmUser.updateMany({
            where: {
              organizationId,
              id: { in: employeeIds },
            },
            data: {
              teamId: id,
            },
          });
        }

        return team;
      });
    },

    async delete(id: string, tx?: Prisma.TransactionClient) {
      const client = tx ?? db;
      return client.team.delete({
        where: { id },
      });
    },

    async getMetrics(id: string, timeframe: 'today' | 'last7days' | 'lastmonth' | 'lastyear' = 'lastmonth') {
      const team = await db.team.findFirst({
        where: { id },
        include: { memberships: { select: { userId: true } } },
      });

      if (!team) return null;

      const userIds = team.memberships.map((membership) => membership.userId);

      const now = new Date();
      const startDate = new Date();
      if (timeframe === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === 'last7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeframe === 'lastmonth') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeframe === 'lastyear') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      const activeProjects = 0;

      // "Tasks Completed" -> activities completed by team members
      const tasksCompleted = await db.activity.count({
        where: {
          createdById: { in: userIds },
          completedAt: { not: null, gte: startDate },
        },
      });

      // Efficiency Rate -> Won leads vs total leads for team members
      const totalLeads = await db.lead.count({
        where: {
          ownerId: { in: userIds },
          createdAt: { gte: startDate },
        },
      });

      const wonLeads = await db.lead.count({
        where: {
          ownerId: { in: userIds },
          status: 'WON',
          createdAt: { gte: startDate },
        },
      });

      const efficiencyRate = totalLeads === 0 ? 0 : Math.round((wonLeads / totalLeads) * 100);

      return {
        activeProjects,
        tasksCompleted,
        efficiencyRate,
      };
    },
  };
}
