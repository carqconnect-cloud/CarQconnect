import { prisma } from '../../../config/database';
import { logger } from '../../../config/logger';
import { syncUserToCustomer } from '../../../common/utils/customerSync';

export interface RaiseTicketInput {
  category: string;
  subject: string;
  description: string;
  hasScreenshot?: boolean;
  screenshotName?: string;
  priority?: string;
  email?: string;
  phone?: string;
  name?: string;
}

export const ticketsService = {
  async raiseTicket(userId: string | undefined, data: RaiseTicketInput) {
    let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

    if (!user && data.email) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { email: data.email.toLowerCase() },
          ],
        },
      });
    }

    if (!user && data.phone) {
      const cleanDigits = data.phone.replace(/[^0-9]/g, '');
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: data.phone },
            ...(cleanDigits.length >= 10 ? [{ phone: { contains: cleanDigits.slice(-10) } }] : []),
          ],
        },
      });
    }

    const email = user?.email || data.email || 'customer@carq.in';
    const phone = user?.phone || data.phone || '';
    const customerName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : (data.name || email);

    // Resolve organization
    let organizationId: string | null = null;
    if (user) {
      const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
      if (membership?.organizationId) organizationId = membership.organizationId;
    }
    if (!organizationId) {
      // Prioritize active CRM user's organization first
      const activeCrmUser = await prisma.crmUser.findFirst({
        where: { status: 'ACTIVE' },
        select: { organizationId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (activeCrmUser?.organizationId) {
        organizationId = activeCrmUser.organizationId;
      }
    }
    if (!organizationId) {
      const carqOrg = await prisma.organization.findFirst({
        where: {
          isActive: true,
          OR: [
            { id: 'cmwkfu1iz0000iw013v5f8km4' },
            { slug: { contains: 'carqconnect', mode: 'insensitive' } },
            { name: { contains: 'CarQconnect', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (carqOrg) organizationId = carqOrg.id;
    }
    if (!organizationId) {
      organizationId = 'cmwkfu1iz0000iw013v5f8km4';
    }

    // CRITICAL: If the requester is an unregistered visitor or inquiry from the website contact page,
    // they are a prospective client (a LEAD) and MUST NOT be saved into the customers or support_tickets table.
    // They are saved strictly into the leads table for the CRM sales team.
    const isProspectiveLead = !user || data.category === 'Website Contact' || !userId;
    if (isProspectiveLead) {
      const lead = await prisma.lead.create({
        data: {
          organizationId,
          name: customerName,
          email: email && email !== 'customer@carq.in' ? email.toLowerCase() : undefined,
          phone: phone || undefined,
          source: 'Website Contact',
          status: 'NEW',
          notes: `[Topic: ${data.category}] Subject: ${data.subject} | Message: ${data.description}`,
        },
      });

      logger.info({ leadId: lead.id, name: customerName }, 'New lead created from contact page/inquiry');

      return {
        id: lead.id,
        ticketId: `#LEAD-${lead.id.slice(-6).toUpperCase()}`,
        status: 'NEW',
        message: 'Lead registered successfully in CRM leads table',
        isLead: true,
      };
    }

    // For registered mobile/web app users only: find or create customer record
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId,
          name: customerName,
          email,
          phone,
          metadata: {
            tickets: [],
            activity: [],
          },
        },
      });
    }

    // Generate ticket ID
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `#FN${randomSuffix}`;
    const subjectFormatted = `[${data.category}] ${data.subject}`;
    const descriptionFormatted = data.hasScreenshot
      ? `${data.description}\n\n[Attachment: ${data.screenshotName || 'screenshot.png'}]`
      : data.description;

    // 1. Save in support_tickets table in DB
    const ticket = await prisma.supportTicket.create({
      data: {
        id: ticketId,
        organizationId: customer.organizationId,
        customerId: customer.id,
        subject: subjectFormatted,
        description: descriptionFormatted,
        status: 'OPEN',
        priority: data.priority || 'MEDIUM',
      },
    });

    // 2. Save in customer table in DB (metadata.tickets & metadata.activity)
    const meta: any = customer.metadata || {};
    const existingTickets = Array.isArray(meta.tickets) ? meta.tickets : [];
    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const newTicketEntry = {
      id: ticket.id,
      rawId: ticket.id,
      type: data.category,
      subject: subjectFormatted,
      description: descriptionFormatted,
      status: 'Open',
      priority: ticket.priority,
      agent: 'Customer Support',
      date: formattedDate,
      createdAt: ticket.createdAt.toISOString(),
    };

    const existingActivity = Array.isArray(meta.activity) ? meta.activity : [];
    const newActivityEntry = {
      id: `ACT-TKT-${ticket.id.replace('#', '')}`,
      message: `Raised support ticket: ${subjectFormatted}`,
      time: formattedDate,
      color: 'bg-red-500',
    };

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        metadata: {
          ...meta,
          tickets: [newTicketEntry, ...existingTickets],
          activity: [newActivityEntry, ...existingActivity],
        },
      },
    });

    // Background sync user to customer
    if (user) {
      syncUserToCustomer(user.id).catch((err) =>
        logger.warn({ err }, 'syncUserToCustomer warning after raising ticket')
      );
    }

    return {
      success: true,
      ticketId: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      message: 'Support ticket raised successfully',
    };
  },

  async getMyTickets(userId: string | undefined, email?: string, phone?: string) {
    let customerIds: string[] = [];

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const customers = await prisma.customer.findMany({
          where: {
            OR: [
              { email: user.email },
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true },
        });
        customerIds = customers.map((c) => c.id);
      }
    } else if (email || phone) {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
        select: { id: true },
      });
      customerIds = customers.map((c) => c.id);
    }

    if (customerIds.length === 0) {
      return [];
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { customerId: { in: customerIds } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      description: t.description,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
    }));
  },
};
