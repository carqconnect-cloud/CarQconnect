import { LeadStatus } from '@prisma/client';
import {
  buildPaginationMeta,
  getPaginationArgs,
} from '../../../common/utils/pagination';
import { adminCrmRepository } from './adminCrm.repository';
import type {
  ListAdminCrmCallsInput,
  ListAdminCrmLeadsInput,
} from './adminCrm.schema';

const ALL_LEAD_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
];

export const adminCrmService = {
  async getOverview() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const { totalLeads, wonLeads, callsToday, rawFunnel } =
      await adminCrmRepository.getOverviewStats(startOfDay);

    const conversionRate =
      totalLeads === 0 ? 0 : Math.round((wonLeads / totalLeads) * 100);

    const countMap = new Map<LeadStatus, number>();
    for (const group of rawFunnel) {
      countMap.set(group.status, group._count._all);
    }

    const leadFunnel = ALL_LEAD_STATUSES.map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));

    return {
      totalLeads,
      conversionRate,
      callsToday,
      wonLeads,
      leadFunnel,
    };
  },

  async listCalls(query: Partial<ListAdminCrmCallsInput> = {}) {
    const pagination = getPaginationArgs(query);

    const { items, total } = await adminCrmRepository.listCalls({
      skip: pagination.skip,
      take: pagination.take,
      search: query.search,
      type: query.type,
      status: query.status,
    });

    const formattedItems = items.map((call) => {
      const customerName =
        call.customer?.name || call.lead?.name || 'Unknown Customer';
      const callType = call.type?.toUpperCase() === 'AI' ? 'AI' : 'Human';
      const agent =
        callType === 'AI' ? 'AI Agent' : call.notes || 'Support Staff';

      return {
        id: call.id,
        customerName,
        customerId: call.customerId,
        leadId: call.leadId,
        type: callType,
        agent,
        outcome: call.status || 'COMPLETED',
        durationSec: call.duration ?? 0,
        ts: call.createdAt.toISOString(),
        createdAt: call.createdAt.toISOString(),
        organization: call.organization
          ? {
              id: call.organization.id,
              name: call.organization.name,
              slug: call.organization.slug,
            }
          : null,
      };
    });

    return {
      items: formattedItems,
      meta: buildPaginationMeta(total, pagination),
    };
  },

  async listLeads(query: Partial<ListAdminCrmLeadsInput> = {}) {
    const pagination = getPaginationArgs(query);

    let statusFilter: LeadStatus | undefined = undefined;
    const requestedStatus = (query.status || query.stage || '').toUpperCase();
    if (requestedStatus && Object.values(LeadStatus).includes(requestedStatus as LeadStatus)) {
      statusFilter = requestedStatus as LeadStatus;
    }

    const { items, total } = await adminCrmRepository.listLeads({
      skip: pagination.skip,
      take: pagination.take,
      search: query.search,
      status: statusFilter,
    });

    const formattedItems = items.map((lead) => ({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      stage: lead.status,
      status: lead.status,
      source: lead.source || 'Direct',
      value: lead.value ? Number(lead.value) : null,
      owner: lead.ownerId || 'Unassigned',
      ts: lead.createdAt.toISOString(),
      createdAt: lead.createdAt.toISOString(),
      convertedAt: lead.convertedAt ? lead.convertedAt.toISOString() : null,
      customer: lead.customer
        ? {
            id: lead.customer.id,
            name: lead.customer.name,
          }
        : null,
      organization: lead.organization
        ? {
            id: lead.organization.id,
            name: lead.organization.name,
            slug: lead.organization.slug,
          }
        : null,
    }));

    return {
      items: formattedItems,
      meta: buildPaginationMeta(total, pagination),
    };
  },
};
