import { prisma } from '../../../config/database';

export const crmTicketService = {
  async listTickets(orgId?: string, filters?: { status?: string; priority?: string; search?: string }) {
    const where: any = {};
    if (orgId) {
      where.organizationId = orgId;
    }
    if (filters?.status && filters.status !== 'All') {
      where.status = { equals: filters.status, mode: 'insensitive' };
    }
    if (filters?.priority && filters.priority !== 'All') {
      where.priority = { equals: filters.priority, mode: 'insensitive' };
    }
    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { subject: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { id: { contains: s, mode: 'insensitive' } },
        { customerId: { contains: s, mode: 'insensitive' } },
        { customer: { name: { contains: s, mode: 'insensitive' } } },
        { customer: { email: { contains: s, mode: 'insensitive' } } },
        { customer: { phone: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return tickets.map((t: any) => {
      const subject = t.subject || 'Support Request';
      const categoryMatch = subject.match(/^\[(.*?)\]/);
      const category = categoryMatch ? categoryMatch[1] : 'General';
      const cleanSubject = categoryMatch ? subject.replace(/^\[.*?\]\s*/, '') : subject;

      return {
        id: t.id,
        subject: cleanSubject,
        rawSubject: t.subject,
        category,
        description: t.description || '',
        status: t.status === 'OPEN' ? 'Open' : t.status === 'RESOLVED' ? 'Resolved' : t.status,
        rawStatus: t.status,
        priority: t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase() : 'Medium',
        rawPriority: t.priority,
        source: 'Mobile App',
        assignee: t.assignedToName || (t.assignedToId ? t.assignedToId : 'Unassigned'),
        assignedToId: t.assignedToId,
        assignedToName: t.assignedToName,
        assignedToRole: t.assignedToRole,
        assignedById: t.assignedById,
        assignedByName: t.assignedByName,
        assignedByRole: t.assignedByRole,
        customer: t.customer?.name || t.customer?.email || 'App Customer',
        customerId: t.customerId,
        customerEmail: t.customer?.email || '',
        customerPhone: t.customer?.phone || '',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        time: new Date(t.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        tags: ['Mobile App', category],
      };
    });
  },

  async findTicketRecord(ticketId: string) {
    const raw = ticketId.trim();
    const decoded = decodeURIComponent(raw);
    const withHash = decoded.startsWith('#') ? decoded : `#${decoded}`;
    const withoutHash = decoded.replace(/^#/, '');

    return prisma.supportTicket.findFirst({
      where: {
        OR: [
          { id: raw },
          { id: decoded },
          { id: withHash },
          { id: withoutHash },
        ],
      },
      include: { customer: true },
    });
  },

  async getTicketById(ticketId: string) {
    const t = await this.findTicketRecord(ticketId);
    if (!t) return null;

    const subject = t.subject || 'Support Request';
    const categoryMatch = subject.match(/^\[(.*?)\]/);
    const category = categoryMatch ? categoryMatch[1] : 'General';
    const cleanSubject = categoryMatch ? subject.replace(/^\[.*?\]\s*/, '') : subject;

    const anyT = t as any;
    return {
      id: t.id,
      subject: cleanSubject,
      rawSubject: t.subject,
      category,
      description: t.description || '',
      status: t.status,
      priority: t.priority,
      assignee: anyT.assignedToName || (t.assignedToId ? t.assignedToId : 'Unassigned'),
      assignedToId: t.assignedToId,
      assignedToName: anyT.assignedToName,
      assignedToRole: anyT.assignedToRole,
      assignedById: anyT.assignedById,
      assignedByName: anyT.assignedByName,
      assignedByRole: anyT.assignedByRole,
      customer: t.customer?.name || t.customer?.email || 'App Customer',
      customerId: t.customerId,
      customerEmail: t.customer?.email || '',
      customerPhone: t.customer?.phone || '',
      createdAt: t.createdAt,
      time: new Date(t.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      tags: ['Mobile App', category],
    };
  },

  async updateTicket(
    ticketId: string,
    data: {
      status?: string;
      priority?: string;
      assignedToId?: string | null;
      assignedToName?: string | null;
      assignedToRole?: string | null;
      assignedById?: string | null;
      assignedByName?: string | null;
      assignedByRole?: string | null;
    }
  ) {
    const updateData: any = {};
    if (data.status) updateData.status = data.status.toUpperCase();
    if (data.priority) updateData.priority = data.priority.toUpperCase();
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.assignedToName !== undefined) updateData.assignedToName = data.assignedToName;
    if (data.assignedToRole !== undefined) updateData.assignedToRole = data.assignedToRole;
    if (data.assignedById !== undefined) updateData.assignedById = data.assignedById;
    if (data.assignedByName !== undefined) updateData.assignedByName = data.assignedByName;
    if (data.assignedByRole !== undefined) updateData.assignedByRole = data.assignedByRole;

    const existing = await this.findTicketRecord(ticketId);
    const targetId = existing ? existing.id : ticketId;

    const updated = await prisma.supportTicket.update({
      where: { id: targetId },
      data: updateData,
    });

    // Also update in customer metadata if customerId is present
    if (updated.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: updated.customerId } });
      if (customer && customer.metadata) {
        const meta: any = customer.metadata;
        if (Array.isArray(meta.tickets)) {
          const tickets = meta.tickets.map((t: any) => {
            if (t.id === ticketId || t.rawId === ticketId) {
              return {
                ...t,
                status: updated.status === 'OPEN' ? 'Open' : (updated.status === 'RESOLVED' ? 'Resolved' : updated.status),
                priority: updated.priority,
              };
            }
            return t;
          });
          await prisma.customer.update({
            where: { id: customer.id },
            data: { metadata: { ...meta, tickets } },
          });
        }
      }
    }

    return updated;
  },

  async getAssignees(_orgId?: string) {
    const crmUsers = await prisma.crmUser.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { firstName: 'asc' },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    });

    const teamHeads = crmUsers
      .filter((u) => u.role === 'TEAM_HEAD')
      .map((u) => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        role: u.role,
      }));

    const employees = crmUsers
      .filter((u) => u.role === 'EXECUTIVE')
      .map((u) => ({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        role: u.role,
      }));

    const allUsers = crmUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      role: u.role,
    }));

    return {
      teamHeads,
      employees: employees.length > 0 ? employees : allUsers,
      allUsers,
      teams: teamHeads.map((h) => ({
        id: h.id,
        name: h.name,
        headId: h.id,
        headName: h.name,
      })),
    };
  },
};

