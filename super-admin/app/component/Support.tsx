'use client';

import React, { useEffect } from 'react';
import {
  $,
  ic,
  escapeHtml,
  fmtDateTime,
  statusBadge,
  renderPriorityBadge,
  badge,
  renderEmpty,
  renderSkeletonTable,
  svgBarChart,
  mountAnimations,
  openDrawer,
  showToast,
  registerTable,
  apiClient,
  DB,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export const supportTabs = [
  { key: 'tickets', label: 'Tickets' },
  { key: 'escalation', label: 'AI escalation queue' },
  { key: 'analytics', label: 'Analytics' },
];

export const ticketsServerState = {
  search: '',
  status: '',
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  loading: false,
  requestId: 0,
};

/* =========================================================================
   ENTITY MAPPER
========================================================================= */
export function mapTicketFromApi(t: any) {
  if (!t) return null;
  const customerName =
    t.customer?.name ||
    (t.user ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() || t.user.email : 'Customer');
  const assigneeName = t.assignedTo
    ? `${t.assignedTo.firstName || ''} ${t.assignedTo.lastName || ''}`.trim() || t.assignedTo.email
    : 'Unassigned';

  return {
    id: t.id,
    subject: t.subject || 'Support Ticket',
    description: t.description || '',
    category: t.category || 'General',
    customerId: t.customerId || t.userId || null,
    customerName,
    priority: t.priority || 'MEDIUM',
    status: t.status || 'OPEN',
    assignedTo: assigneeName,
    assignedToId: t.assignedToId || null,
    aiEscalated: Boolean(t.aiEscalated),
    aiSummary: t.aiSummary || null,
    resolvedAt: t.resolvedAt ? new Date(t.resolvedAt).getTime() : null,
    createdAt: new Date(t.createdAt).getTime(),
    updatedAt: new Date(t.updatedAt).getTime(),
    messages: (t.messages || []).map((m: any) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderType: m.senderType,
      senderId: m.senderId,
      message: m.message,
      createdAt: new Date(m.createdAt).getTime(),
    })),
    vehicle: t.vehicle ? `${t.vehicle.reg}${t.vehicle.model ? ' (' + t.vehicle.model + ')' : ''}` : null,
    organization: t.organization?.name || null,
    raw: t,
  };
}

/* =========================================================================
   SERVER DATA FETCHING & SYNCHRONIZER
========================================================================= */
export function renderTicketsTable() {
  const tbl = $('tbl-tickets');
  if (!tbl) return;

  const rows = DB.tickets;
  const total = ticketsServerState.total;
  const page = ticketsServerState.page;
  const perPage = ticketsServerState.limit;
  const totalPages = ticketsServerState.totalPages;
  const loading = ticketsServerState.loading;

  if (!rows || rows.length === 0) {
    tbl.innerHTML = renderEmpty('No tickets found', 'Try a different status filter or search keyword.', 'headset');
    return;
  }

  const cols = [
    { key: 'subject', label: 'Ticket', render: (r: any) => `<div><div class="cell-primary">${escapeHtml(r.subject)}</div><div class="cell-sub">${escapeHtml(r.category)}</div></div>` },
    { key: 'customerName', label: 'Customer', render: (r: any) => escapeHtml(r.customerName) },
    { key: 'priority', label: 'Priority', render: (r: any) => renderPriorityBadge(r.priority) },
    { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
    { key: 'assignedTo', label: 'Assigned to', render: (r: any) => escapeHtml(r.assignedTo) },
  ];

  const head = cols.map((c) => `<th>${c.label}</th>`).join('');
  const body = rows
    .map((r: any) => {
      const cells = cols.map((c) => `<td>${c.render(r)}</td>`).join('');
      return `<tr class="row-click" data-action="view-ticket" data-id="${escapeHtml(r.id)}">${cells}</tr>`;
    })
    .join('');

  const from = total > 0 ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);

  const pager = `
    <div class="pager">
      <span>Showing ${from}–${to} of ${total}</span>
      <div class="pager-btns">
        <button class="btn-icon" data-action="page-ticket-table" data-dir="prev" ${page <= 1 || loading ? 'disabled' : ''}>
          ${ic('arrowLeft')}
        </button>
        <span class="pager-page">Page ${page} / ${totalPages}</span>
        <button class="btn-icon" data-action="page-ticket-table" data-dir="next" ${page >= totalPages || loading ? 'disabled' : ''}>
          ${ic('chevRight')}
        </button>
      </div>
    </div>
  `;

  tbl.innerHTML = `<div class="table-wrap"><table class="dtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${pager}`;
}

export async function fetchTicketsServer(targetPage?: number) {
  if (typeof targetPage === 'number') {
    ticketsServerState.page = targetPage;
  }
  const currentReqId = ++ticketsServerState.requestId;
  ticketsServerState.loading = true;

  const tbl = $('tbl-tickets');
  const chip = $('tickets-count-chip');

  if (tbl && (!DB.tickets || DB.tickets.length === 0)) {
    tbl.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading tickets from server…</div>`;
  }

  const query: Record<string, any> = {
    page: ticketsServerState.page,
    limit: ticketsServerState.limit,
  };
  if (ticketsServerState.search) {
    query.search = ticketsServerState.search;
  }
  if (ticketsServerState.status && ticketsServerState.status !== 'ALL') {
    query.status = ticketsServerState.status;
  }

  try {
    const res: any = await apiClient.getWithMeta('/admin/support/tickets', query);
    if (currentReqId !== ticketsServerState.requestId) return;

    ticketsServerState.loading = false;
    const rawItems = res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(rawItems)) {
      throw new Error('Malformed API response: expected ticket array in data');
    }

    const meta = res?.meta;
    const pagination = meta?.pagination || meta;

    if (!pagination || typeof pagination !== 'object') {
      throw new Error('Missing pagination metadata in API response');
    }

    const { total, page, limit, totalPages } = pagination;

    if (typeof total !== 'number' || isNaN(total) || total < 0) {
      throw new Error('Invalid or missing total count in pagination metadata');
    }
    if (typeof page !== 'number' || isNaN(page) || page < 1) {
      throw new Error('Invalid or missing page in pagination metadata');
    }
    if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
      throw new Error('Invalid or missing limit in pagination metadata');
    }
    if (typeof totalPages !== 'number' || isNaN(totalPages) || totalPages < 1) {
      throw new Error('Invalid or missing totalPages in pagination metadata');
    }

    ticketsServerState.total = total;
    ticketsServerState.totalPages = totalPages;

    const targetValidPage = Math.max(1, totalPages);
    if (ticketsServerState.page > targetValidPage) {
      ticketsServerState.page = targetValidPage;
      return fetchTicketsServer(targetValidPage);
    }

    DB.tickets = rawItems.map(mapTicketFromApi).filter(Boolean);

    if (chip) {
      chip.innerHTML = `${ic('headset')} ${total} ticket${total === 1 ? '' : 's'}`;
    }

    renderTicketsTable();
  } catch (err: any) {
    if (currentReqId !== ticketsServerState.requestId) return;
    ticketsServerState.loading = false;
    if (chip) {
      chip.innerHTML = `${ic('headset')} Error`;
    }
    if (tbl) {
      tbl.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);">
        <div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">
          ${ic('alert')} Failed to load tickets
        </div>
        <p class="muted" style="font-size:13px;margin-bottom:12px;">
          ${escapeHtml(err.message || 'API connection failed')}
        </p>
        <button class="btn btn-sm btn-ghost" data-action="retry-tickets">Retry</button>
      </div>`;
    }
  }
}

export async function syncTickets(query: any = {}) {
  if (query.search !== undefined) ticketsServerState.search = query.search;
  if (query.status !== undefined) ticketsServerState.status = query.status;
  if (query.page !== undefined) ticketsServerState.page = query.page;
  await fetchTicketsServer();
  return DB.tickets;
}

/* =========================================================================
   DRAWER
========================================================================= */
export async function openTicketDrawer(id: string) {
  const head = `<div class="drawer-head"><div><h3 class="mono">Support Ticket</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">Loading data…</div></div>
  <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
  openDrawer(head, [{ key: 'conv', label: 'Conversation' }], 'conv', () => '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading ticket data…</div>');

  try {
    const raw: any = await apiClient.get(`/admin/support/tickets/${encodeURIComponent(id)}`);
    const t = mapTicketFromApi(raw);
    if (!t) return;

    const liveHead = `<div class="drawer-head"><div><h3 class="mono">${escapeHtml(t.subject)}</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">${escapeHtml(t.customerName)} · ${escapeHtml(t.category)} · ${statusBadge(t.status)}</div></div>
    <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    const tabs = [
      { key: 'conv', label: 'Conversation & Actions' },
      { key: 'details', label: 'Details' },
    ];

    function render(tab: string) {
      if (tab === 'conv') {
        let timelineHtml = '';
        if (t.messages && t.messages.length > 0) {
          timelineHtml = t.messages
            .map((m: any) => {
              const isAdmin = m.senderType === 'ADMIN';
              const isAi = m.senderType === 'AI_BOT';
              const dotColor = isAdmin ? 'var(--success)' : isAi ? 'var(--info)' : 'var(--accent)';
              const senderLabel = isAdmin ? 'Support Admin' : isAi ? 'AI Assistant' : escapeHtml(t.customerName);

              return `<div class="tl-item">
              <div class="tl-dot" style="background:${dotColor}"></div>
              <div class="tl-body">
                <b>${senderLabel} <span class="muted" style="font-weight:normal;font-size:11px;">(${m.senderType})</span></b>
                <p style="white-space:pre-wrap;margin-top:4px;">${escapeHtml(m.message)}</p>
                <div class="tl-time">${fmtDateTime(m.createdAt)}</div>
              </div>
            </div>`;
            })
            .join('');
        } else {
          timelineHtml = `<div class="tl-item">
            <div class="tl-dot"></div>
            <div class="tl-body">
              <b>${escapeHtml(t.customerName)}</b>
              <p>${escapeHtml(t.description || t.subject)}</p>
              <div class="tl-time">${fmtDateTime(t.createdAt)}</div>
            </div>
          </div>`;
        }

        const aiCallout = t.aiEscalated
          ? `<div class="card p-3" style="background:var(--bg-subtle, rgba(59,130,246,0.08));border-left:3px solid var(--info);margin:12px 0;">
            <div style="font-weight:600;font-size:12px;color:var(--info);margin-bottom:2px;">AI Escalation Note</div>
            <p style="font-size:12.5px;margin:0;">${escapeHtml(t.aiSummary || 'Flagged for human agent escalation.')}</p>
          </div>`
          : '';

        const replyForm = `
          <div class="divider"></div>
          <div class="field">
            <label>Reply to Customer (as Admin)</label>
            <textarea id="f-ticket-reply" placeholder="Type your response to the customer…" rows="3" style="resize:vertical;"></textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-ticket-reply" style="margin-top:6px;" data-action="send-ticket-reply" data-id="${escapeHtml(t.id)}">
            Send reply
          </button>
        `;

        const statusForm = `
          <div class="divider"></div>
          <div class="field">
            <label>Ticket Status</label>
            <select id="f-ticket-status">
              ${['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED']
                .map((s) => `<option value="${s}" ${t.status.toUpperCase() === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`)
                .join('')}
            </select>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-ticket-status" style="margin-top:6px;" data-action="update-ticket-status" data-id="${escapeHtml(t.id)}">
            Save status
          </button>
        `;

        const assignForm = `
          <div class="divider"></div>
          <div class="field">
            <label>Staff Assignment</label>
            <div class="hstack" style="gap:8px;">
              <input id="f-ticket-assignee" placeholder="Super Admin User ID" value="${escapeHtml(t.assignedToId || '')}" style="flex:1;">
              <button class="btn btn-sm btn-ghost" id="btn-ticket-assign" data-action="assign-ticket" data-id="${escapeHtml(t.id)}">Assign</button>
              <button class="btn btn-sm btn-ghost" id="btn-ticket-unassign" data-action="unassign-ticket" data-id="${escapeHtml(t.id)}">Unassign</button>
            </div>
            <span class="cell-sub" style="display:block;margin-top:4px;">Current Assignee: <b>${escapeHtml(t.assignedTo)}</b></span>
          </div>
        `;

        return `<div class="timeline">${timelineHtml}</div>${aiCallout}${replyForm}${statusForm}${assignForm}`;
      }

      if (tab === 'details') {
        return `<div class="kv-grid">
          <div class="kv"><span class="k">Ticket ID</span><span class="v mono">${escapeHtml(t.id)}</span></div>
          <div class="kv"><span class="k">Category</span><span class="v">${escapeHtml(t.category)}</span></div>
          <div class="kv"><span class="k">Priority</span><span class="v">${renderPriorityBadge(t.priority)}</span></div>
          <div class="kv"><span class="k">Status</span><span class="v">${statusBadge(t.status)}</span></div>
          <div class="kv"><span class="k">Assigned To</span><span class="v">${escapeHtml(t.assignedTo)}</span></div>
          <div class="kv"><span class="k">Customer</span><span class="v">${escapeHtml(t.customerName)}</span></div>
          <div class="kv"><span class="k">Organization</span><span class="v">${escapeHtml(t.organization || 'Direct Consumer')}</span></div>
          <div class="kv"><span class="k">Vehicle</span><span class="v">${escapeHtml(t.vehicle || 'None')}</span></div>
          <div class="kv"><span class="k">Created</span><span class="v">${fmtDateTime(t.createdAt)}</span></div>
          <div class="kv"><span class="k">Resolved At</span><span class="v">${t.resolvedAt ? fmtDateTime(t.resolvedAt) : 'Unresolved'}</span></div>
          <div class="kv"><span class="k">AI Escalated</span><span class="v">${t.aiEscalated ? 'Yes' : 'No'}</span></div>
        </div>`;
      }
      return '';
    }

    openDrawer(liveHead, tabs, 'conv', render);
  } catch (err: any) {
    const errHead = `<div class="drawer-head"><div><h3>Error</h3></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    openDrawer(errHead, [{ key: 'error', label: 'Error' }], 'error', () => `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load ticket details: ${escapeHtml(err.message)}</div>`);
  }
}

/* =========================================================================
   TABS & ROUTE VIEW RENDERER
========================================================================= */
export function renderSupportTab(tab: string) {
  const body = $('sup-body');
  if (!body) return;

  if (tab === 'tickets') {
    const hasCached = Array.isArray(DB.tickets) && DB.tickets.length > 0;
    body.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-search">
          ${ic('search')}
          <input placeholder="Search subject, customer…" data-table-search="tickets" value="${escapeHtml(ticketsServerState.search)}">
        </div>
        <select data-table-filter="tickets" data-filter-key="status">
          <option value="" ${ticketsServerState.status === '' ? 'selected' : ''}>All statuses</option>
          <option value="OPEN" ${ticketsServerState.status === 'OPEN' ? 'selected' : ''}>Open</option>
          <option value="IN_PROGRESS" ${ticketsServerState.status === 'IN_PROGRESS' ? 'selected' : ''}>In progress</option>
          <option value="ESCALATED" ${ticketsServerState.status === 'ESCALATED' ? 'selected' : ''}>Escalated</option>
          <option value="RESOLVED" ${ticketsServerState.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
        </select>
        <div class="spacer"></div>
        <span class="chip" id="tickets-count-chip">${ic('headset')} ${hasCached ? `${ticketsServerState.total} Tickets` : 'Loading…'}</span>
      </div>
      <div id="tbl-tickets">
        ${hasCached ? '' : renderSkeletonTable(6, 6)}
      </div>
    `;

    registerTable('tickets', () => renderTicketsTable());
    if (hasCached) {
      renderTicketsTable();
    }
    fetchTicketsServer();
  } else if (tab === 'escalation') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading AI escalation queue…</div>`;
    apiClient
      .get('/admin/support/ai-escalations', { page: 1, limit: 100 })
      .then((res: any) => {
        const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
        const rows = rawItems.map(mapTicketFromApi).filter(Boolean);

        if (!rows.length) {
          body.innerHTML = renderEmpty('No AI escalations', 'No conversation has needed human handoff recently.', 'headset');
          return;
        }

        const cols = [
          { key: 'subject', label: 'Ticket', sortable: true, render: (r: any) => `<div><div class="cell-primary">${escapeHtml(r.subject)}</div><div class="cell-sub">${escapeHtml(r.category)}</div></div>` },
          { key: 'customerName', label: 'Customer', sortable: true, render: (r: any) => escapeHtml(r.customerName) },
          { key: 'aiSummary', label: 'AI summary', sortable: false, render: (r: any) => `<span class="cell-sub">${escapeHtml(r.aiSummary || 'Flagged for human triage')}</span>` },
          { key: 'priority', label: 'Priority', sortable: true, render: (r: any) => renderPriorityBadge(r.priority) },
          { key: 'status', label: 'Status', sortable: true, render: (r: any) => statusBadge(r.status) },
        ];

        body.innerHTML = `<div id="tbl-esc"></div>`;
        registerTable('esc', () => ({
          innerHTML: '',
        } as any));
        body.innerHTML = `<div class="table-wrap"><table class="dtable"><thead><tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map((r: any) => `<tr class="row-click" data-action="view-ticket" data-id="${r.id}">${cols.map(c => `<td>${c.render(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      })
      .catch((err) => {
        body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load AI escalations</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message || 'API connection failed')}</p><button class="btn btn-sm btn-ghost" data-action="retry-support-tab" data-tab="escalation">Retry</button></div>`;
      });
  } else if (tab === 'analytics') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading support analytics…</div>`;
    apiClient
      .get('/admin/support/analytics')
      .then((data: any) => {
        const totalTickets = data.totalTickets ?? 0;
        const openTickets = data.openTickets ?? 0;
        const inProgressTickets = data.inProgressTickets ?? 0;
        const escalatedTickets = data.escalatedTickets ?? 0;
        const resolvedTickets = data.resolvedTickets ?? 0;
        const aiEscalatedCount = data.aiEscalatedCount ?? 0;
        const unassignedCount = data.unassignedCount ?? 0;
        const byCat = data.byCategory || {};
        const byPri = data.byPriority || {};

        const catKeys = Object.keys(byCat);
        const catVals = Object.values(byCat) as number[];

        const kpisHtml = `
          <div class="grid grid-cols-4 gap-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">Total Tickets</div><div style="font-size:20px;font-weight:700;margin-top:2px;">${totalTickets}</div></div>
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">Open</div><div style="font-size:20px;font-weight:700;margin-top:2px;color:var(--warning);">${openTickets}</div></div>
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">In Progress</div><div style="font-size:20px;font-weight:700;margin-top:2px;color:var(--info);">${inProgressTickets}</div></div>
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">Escalated</div><div style="font-size:20px;font-weight:700;margin-top:2px;color:var(--danger);">${escalatedTickets}</div></div>
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">Resolved</div><div style="font-size:20px;font-weight:700;margin-top:2px;color:var(--success);">${resolvedTickets}</div></div>
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">AI Escalated</div><div style="font-size:20px;font-weight:700;margin-top:2px;color:var(--accent);">${aiEscalatedCount}</div></div>
            <div class="card p-3"><div class="muted" style="font-size:11.5px;">Active Unassigned</div><div style="font-size:20px;font-weight:700;margin-top:2px;">${unassignedCount}</div></div>
          </div>
        `;

        const chartSection = catKeys.length
          ? `<div class="card"><div class="card-title">Tickets by category</div>
               ${svgBarChart(catKeys.map((k) => k.slice(0, 5)), catVals, 'var(--accent)')}
               <div class="list-simple" style="margin-top:12px;">
                 ${catKeys.map((k) => `<div class="list-simple-row"><span style="font-size:12.5px;">${escapeHtml(k)}</span><span class="cell-sub" style="font-weight:600;">${byCat[k]}</span></div>`).join('')}
               </div>
             </div>`
          : `<div class="card"><div class="card-title">Tickets by category</div><p class="muted" style="font-size:13px;padding:24px 0;text-align:center;">No category records available.</p></div>`;

        const benchmarksSection = `
          <div class="card">
            <div class="card-title">Operational SLAs & AI Telemetry</div>
            <p class="muted" style="font-size:12.5px;margin-bottom:16px;">Telemetry boundaries adhere strictly to verified production capabilities; metrics remain unconfigured until authoritative rules are active.</p>
            <div class="bench-list">
              <div class="bench-row" style="padding:10px 0;border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.06));">
                <div>
                  <div style="font-weight:600;font-size:13px;">First Response SLA</div>
                  <div class="cell-sub">${escapeHtml(data.firstResponse?.reason || 'Authoritative SLA window not defined')}</div>
                </div>
                <div>${badge(data.firstResponse?.status || 'UNCONFIGURED', 'neutral')}</div>
              </div>
              <div class="bench-row" style="padding:10px 0;border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.06));">
                <div>
                  <div style="font-weight:600;font-size:13px;">AI Containment</div>
                  <div class="cell-sub">${escapeHtml(data.aiContainment?.reason || 'Customer AI conversation data deferred')}</div>
                </div>
                <div>${badge(data.aiContainment?.status || 'UNAVAILABLE', 'neutral')}</div>
              </div>
              <div class="bench-row" style="padding:10px 0;">
                <div>
                  <div style="font-weight:600;font-size:13px;">Priority Distribution</div>
                  <div class="cell-sub">
                    ${Object.keys(byPri).length ? Object.entries(byPri).map(([p, cnt]) => `${p}: ${cnt}`).join(' · ') : 'No tickets recorded'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        body.innerHTML = `${kpisHtml}<div class="two-col">${chartSection}${benchmarksSection}</div>`;
        mountAnimations();
      })
      .catch((err) => {
        body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load support analytics</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message || 'API connection failed')}</p><button class="btn btn-sm btn-ghost" data-action="retry-support-tab" data-tab="analytics">Retry</button></div>`;
      });
  }
}

export function renderSupportView(params?: any[]) {
  const tab = params && params[0] ? params[0] : 'tickets';
  const viewEl = $('view');
  if (!viewEl) return;

  viewEl.innerHTML = `
    <div class="page-head"><div><h1>Support desk</h1><p>Customer tickets, AI-escalated conversations and support performance.</p></div></div>
    <div class="tabs">${supportTabs.map((t) => `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="support" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
    <div id="sup-body"></div>
  `;
  renderSupportTab(tab);
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerSupportSection() {
  registerRoute('support', renderSupportView);

  registerActions({
    'view-ticket': (el: HTMLElement) => {
      if (el.dataset.id) openTicketDrawer(el.dataset.id);
    },
    'update-ticket-status': async (el: any) => {
      const id = el.dataset.id;
      const statusEl = $('f-ticket-status') as HTMLSelectElement;
      if (!id || !statusEl) return;
      const newStatus = statusEl.value;
      const btn = el.closest('button') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Saving…';
      }
      try {
        await apiClient.patch(`/admin/support/tickets/${encodeURIComponent(id)}/status`, { status: newStatus });
        showToast('Ticket status updated to ' + newStatus.replace('_', ' '));
        await fetchTicketsServer(ticketsServerState.page);
        openTicketDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to update ticket status', 'danger');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Save status';
        }
      }
    },
    'assign-ticket': async (el: any) => {
      const id = el.dataset.id;
      const inputEl = $('f-ticket-assignee') as HTMLInputElement;
      if (!id || !inputEl) return;
      const assignedToId = inputEl.value.trim() || null;
      const btn = el.closest('button') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';
      }
      try {
        await apiClient.post(`/admin/support/tickets/${encodeURIComponent(id)}/assign`, { assignedToId });
        showToast(assignedToId ? 'Ticket assigned successfully.' : 'Ticket unassigned.');
        await fetchTicketsServer(ticketsServerState.page);
        openTicketDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to assign ticket', 'danger');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Assign';
        }
      }
    },
    'unassign-ticket': async (el: any) => {
      const id = el.dataset.id;
      if (!id) return;
      const btn = el.closest('button') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';
      }
      try {
        await apiClient.post(`/admin/support/tickets/${encodeURIComponent(id)}/assign`, { assignedToId: null });
        showToast('Ticket unassigned.');
        await fetchTicketsServer(ticketsServerState.page);
        openTicketDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to unassign ticket', 'danger');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Unassign';
        }
      }
    },
    'send-ticket-reply': async (el: any) => {
      const id = el.dataset.id;
      const replyEl = $('f-ticket-reply') as HTMLTextAreaElement;
      if (!id || !replyEl) return;
      const message = replyEl.value.trim();
      if (!message) {
        showToast('Reply cannot be empty', 'warning');
        return;
      }
      const btn = el.closest('button') as HTMLButtonElement;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Sending…';
      }
      try {
        await apiClient.post(`/admin/support/tickets/${encodeURIComponent(id)}/messages`, { message });
        showToast('Administrative reply sent.');
        replyEl.value = '';
        await fetchTicketsServer(ticketsServerState.page);
        openTicketDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to send reply', 'danger');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Send reply';
        }
      }
    },
    'page-ticket-table': (el: any) => {
      if (ticketsServerState.loading) return;
      const dir = el.dataset.dir;
      const current = ticketsServerState.page || 1;
      const next = dir === 'next' ? current + 1 : current - 1;
      if (next >= 1 && next <= ticketsServerState.totalPages) {
        fetchTicketsServer(next);
      }
    },
    'retry-tickets': () => {
      fetchTicketsServer();
    },
    'retry-support-tab': (el: any) => {
      if (el.dataset.tab) renderSupportTab(el.dataset.tab);
    },
  });
}

// Auto-register upon import
registerSupportSection();

export default function Support() {
  useEffect(() => {
    renderSupportView();
  }, []);

  return <div id="support-component-root" />;
}
