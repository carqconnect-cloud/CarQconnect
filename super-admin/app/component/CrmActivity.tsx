'use client';

import React from 'react';
import {
  $,
  $q,
  $$,
  ic,
  badge,
  statusBadge,
  renderEmpty,
  fmtDate,
  timeAgo,
  escapeHtml,
  apiClient,
  DB,
  tableState,
  registerTable,
  refreshTable,
  mountAnimations,
  registerRoute,
  registerActions,
  svgBarChart,
} from '../../lib/adminShared';

export function mapCrmCallFromApi(c: any) {
  if (!c) return null;
  return {
    id: c.id,
    customerName: c.customerName || c.customer?.name || c.lead?.name || 'Unknown customer',
    type: c.type || 'Human',
    agent: c.agent || (c.type === 'AI' ? 'AI Agent' : 'Staff Executive'),
    outcome: c.outcome || c.status || 'COMPLETED',
    durationSec: c.durationSec ?? c.duration ?? 0,
    ts: c.ts ? new Date(c.ts).getTime() : c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
    organization: c.organization || null,
    raw: c,
  };
}

export function mapLeadFromApi(l: any) {
  if (!l) return null;
  return {
    id: l.id,
    name: l.name,
    phone: l.phone || 'N/A',
    stage: l.stage || l.status || 'New',
    source: l.source || 'Website',
    owner: l.owner || l.ownerId || 'Unassigned',
    ts: l.ts ? new Date(l.ts).getTime() : l.createdAt ? new Date(l.createdAt).getTime() : Date.now(),
    organization: l.organization || null,
    raw: l,
  };
}

export const crmCallsServerState = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  loading: false,
  search: '',
  requestId: 0,
};

export const crmLeadsServerState = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  loading: false,
  search: '',
  requestId: 0,
};

export function renderCrmCallsTable() {
  const tbl = $('tbl-calls');
  if (!tbl) return;

  const rows = DB.crmCalls;
  const total = crmCallsServerState.total;
  const page = crmCallsServerState.page;
  const perPage = crmCallsServerState.limit;
  const totalPages = crmCallsServerState.totalPages;
  const loading = crmCallsServerState.loading;

  if (!rows || rows.length === 0) {
    tbl.innerHTML = renderEmpty('No calls found', 'Try a different search keyword.', 'phone');
    return;
  }

  const cols = [
    { key: 'customerName', label: 'Customer', render: (r: any) => escapeHtml(r.customerName) },
    { key: 'type', label: 'Type', render: (r: any) => badge(r.type, r.type === 'AI' ? 'info' : 'neutral') },
    { key: 'agent', label: 'Agent', render: (r: any) => escapeHtml(r.agent) },
    { key: 'outcome', label: 'Outcome', render: (r: any) => statusBadge(r.outcome) },
    { key: 'durationSec', label: 'Duration', render: (r: any) => Math.floor(r.durationSec / 60) + 'm ' + (r.durationSec % 60) + 's' },
    { key: 'ts', label: 'When', render: (r: any) => timeAgo(r.ts) },
  ];

  const head = cols.map(c => `<th>${c.label}</th>`).join('');
  const body = rows.map((r: any) => {
    const cells = cols.map(c => `<td>${c.render(r)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const from = total > 0 ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);

  const pager = `
  <div class="pager">
    <span>Showing ${from}–${to} of ${total}</span>
    <div class="pager-btns">
      <button class="btn-icon" data-action="page-crm-calls" data-table="calls" data-dir="prev" ${page <= 1 || loading ? 'disabled' : ''}>
        ${ic('arrowLeft')}
      </button>
      <span class="pager-page">Page ${page} / ${totalPages}</span>
      <button class="btn-icon" data-action="page-crm-calls" data-table="calls" data-dir="next" ${page >= totalPages || loading ? 'disabled' : ''}>
        ${ic('chevRight')}
      </button>
    </div>
  </div>
`;

  tbl.innerHTML = `<div class="table-wrap"><table class="dtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${pager}`;
}

export async function fetchCrmCallsServer(targetPage?: number) {
  if (typeof targetPage === 'number') {
    crmCallsServerState.page = targetPage;
  }
  const currentReqId = ++crmCallsServerState.requestId;
  crmCallsServerState.loading = true;

  const tbl = $('tbl-calls');
  const chip = $('calls-count-chip');

  if (tbl && (!DB.crmCalls || DB.crmCalls.length === 0)) {
    tbl.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading calls from server…</div>`;
  }

  const query: Record<string, any> = {
    page: crmCallsServerState.page,
    limit: crmCallsServerState.limit,
  };
  if (crmCallsServerState.search) {
    query.search = crmCallsServerState.search;
  }

  try {
    const res: any = await apiClient.getWithMeta('/admin/crm/calls', query);
    if (currentReqId !== crmCallsServerState.requestId) return;

    crmCallsServerState.loading = false;
    const rawItems = res?.data || (Array.isArray(res) ? res : []);
    const meta = res?.meta;
    const pagination = meta?.pagination || meta;

    const total = typeof pagination?.total === 'number' ? pagination.total : rawItems.length;
    const totalPages = typeof pagination?.totalPages === 'number' ? Math.max(1, pagination.totalPages) : Math.max(1, Math.ceil(total / crmCallsServerState.limit));

    crmCallsServerState.total = total;
    crmCallsServerState.totalPages = totalPages;

    const targetValidPage = Math.max(1, totalPages);
    if (crmCallsServerState.page > targetValidPage && total > 0) {
      crmCallsServerState.page = targetValidPage;
      return fetchCrmCallsServer(targetValidPage);
    }

    DB.crmCalls = rawItems.map(mapCrmCallFromApi).filter(Boolean);

    if (chip) {
      chip.innerHTML = `${ic('phone')} ${total} call${total === 1 ? '' : 's'}`;
    }

    renderCrmCallsTable();
  } catch (err: any) {
    if (currentReqId !== crmCallsServerState.requestId) return;
    crmCallsServerState.loading = false;
    if (chip) {
      chip.innerHTML = `${ic('phone')} Error`;
    }
    if (tbl) {
      tbl.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);">
      <div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">
        ${ic('alert')} Failed to load calls
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:12px;">
        ${escapeHtml(err.message || 'API connection failed')}
      </p>
      <button class="btn btn-sm btn-ghost" data-action="retry-crm-tab" data-tab="calls">Retry</button>
    </div>`;
    }
  }
}

export function renderCrmLeadsTable() {
  const tbl = $('tbl-leads');
  if (!tbl) return;

  const rows = DB.leads;
  const total = crmLeadsServerState.total;
  const page = crmLeadsServerState.page;
  const perPage = crmLeadsServerState.limit;
  const totalPages = crmLeadsServerState.totalPages;
  const loading = crmLeadsServerState.loading;

  if (!rows || rows.length === 0) {
    tbl.innerHTML = renderEmpty('No leads found', 'Try a different search term.', 'users');
    return;
  }

  const cols = [
    { key: 'name', label: 'Lead', render: (r: any) => escapeHtml(r.name) },
    { key: 'phone', label: 'Phone', render: (r: any) => `<span class="mono">+91 ${escapeHtml(r.phone)}</span>` },
    { key: 'stage', label: 'Stage', render: (r: any) => statusBadge(r.stage) },
    { key: 'source', label: 'Source', render: (r: any) => escapeHtml(r.source) },
    { key: 'owner', label: 'Owner', render: (r: any) => escapeHtml(r.owner) },
  ];

  const head = cols.map(c => `<th>${c.label}</th>`).join('');
  const body = rows.map((r: any) => {
    const cells = cols.map(c => `<td>${c.render(r)}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const from = total > 0 ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);

  const pager = `
  <div class="pager">
    <span>Showing ${from}–${to} of ${total}</span>
    <div class="pager-btns">
      <button class="btn-icon" data-action="page-crm-leads" data-table="leads" data-dir="prev" ${page <= 1 || loading ? 'disabled' : ''}>
        ${ic('arrowLeft')}
      </button>
      <span class="pager-page">Page ${page} / ${totalPages}</span>
      <button class="btn-icon" data-action="page-crm-leads" data-table="leads" data-dir="next" ${page >= totalPages || loading ? 'disabled' : ''}>
        ${ic('chevRight')}
      </button>
    </div>
  </div>
`;

  tbl.innerHTML = `<div class="table-wrap"><table class="dtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${pager}`;
}

export async function fetchCrmLeadsServer(targetPage?: number) {
  if (typeof targetPage === 'number') {
    crmLeadsServerState.page = targetPage;
  }
  const currentReqId = ++crmLeadsServerState.requestId;
  crmLeadsServerState.loading = true;

  const tbl = $('tbl-leads');
  const chip = $('leads-count-chip');

  if (tbl && (!DB.leads || DB.leads.length === 0)) {
    tbl.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading leads from server…</div>`;
  }

  const query: Record<string, any> = {
    page: crmLeadsServerState.page,
    limit: crmLeadsServerState.limit,
  };
  if (crmLeadsServerState.search) {
    query.search = crmLeadsServerState.search;
  }

  try {
    const res: any = await apiClient.getWithMeta('/admin/crm/leads', query);
    if (currentReqId !== crmLeadsServerState.requestId) return;

    crmLeadsServerState.loading = false;
    const rawItems = res?.data || (Array.isArray(res) ? res : []);
    const meta = res?.meta;
    const pagination = meta?.pagination || meta;

    const total = typeof pagination?.total === 'number' ? pagination.total : rawItems.length;
    const totalPages = typeof pagination?.totalPages === 'number' ? Math.max(1, pagination.totalPages) : Math.max(1, Math.ceil(total / crmLeadsServerState.limit));

    crmLeadsServerState.total = total;
    crmLeadsServerState.totalPages = totalPages;

    const targetValidPage = Math.max(1, totalPages);
    if (crmLeadsServerState.page > targetValidPage && total > 0) {
      crmLeadsServerState.page = targetValidPage;
      return fetchCrmLeadsServer(targetValidPage);
    }

    DB.leads = rawItems.map(mapLeadFromApi).filter(Boolean);

    if (chip) {
      chip.innerHTML = `${ic('users')} ${total} lead${total === 1 ? '' : 's'}`;
    }

    renderCrmLeadsTable();
  } catch (err: any) {
    if (currentReqId !== crmLeadsServerState.requestId) return;
    crmLeadsServerState.loading = false;
    if (chip) {
      chip.innerHTML = `${ic('users')} Error`;
    }
    if (tbl) {
      tbl.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);">
      <div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">
        ${ic('alert')} Failed to load leads
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:12px;">
        ${escapeHtml(err.message || 'API connection failed')}
      </p>
      <button class="btn btn-sm btn-ghost" data-action="retry-crm-tab" data-tab="history">Retry</button>
    </div>`;
    }
  }
}

export async function syncCrmOverview() {
  try {
    const res: any = await apiClient.get('/admin/crm/overview');
    DB.crmOverview = res;
    return DB.crmOverview;
  } catch (_err) {
    return DB.crmOverview;
  }
}

export async function syncCrmCalls(query: any = {}) {
  if (query.search !== undefined) crmCallsServerState.search = query.search;
  if (query.page !== undefined) crmCallsServerState.page = query.page;
  if (query.limit !== undefined) crmCallsServerState.limit = query.limit;
  await fetchCrmCallsServer();
  return DB.crmCalls;
}

export async function syncCrmLeads(query: any = {}) {
  if (query.search !== undefined) crmLeadsServerState.search = query.search;
  if (query.page !== undefined) crmLeadsServerState.page = query.page;
  if (query.limit !== undefined) crmLeadsServerState.limit = query.limit;
  await fetchCrmLeadsServer();
  return DB.leads;
}

const crmTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'calls', label: 'Call activity' },
  { key: 'history', label: 'Customer history' },
];

export function renderCrmTab(tab: string) {
  const body = $('crm-body');
  if (!body) return;

  if (tab === 'overview') {
    const totalLeads = DB.crmOverview ? DB.crmOverview.totalLeads : DB.leads.length;
    const conversionRate = DB.crmOverview ? DB.crmOverview.conversionRate : (totalLeads ? Math.round(DB.leads.filter((l: any) => l.stage === 'Converted' || l.stage === 'WON').length / totalLeads * 100) : 0);
    const callsToday = DB.crmOverview ? DB.crmOverview.callsToday : DB.crmCalls.length;
    const stages = ['New', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Not Interested'];
    const funnelCounts = DB.crmOverview?.leadFunnel
      ? [
        DB.crmOverview.leadFunnel.find((f: any) => f.status === 'NEW')?.count ?? 0,
        DB.crmOverview.leadFunnel.find((f: any) => f.status === 'CONTACTED')?.count ?? 0,
        (DB.crmOverview.leadFunnel.find((f: any) => f.status === 'QUALIFIED')?.count ?? 0) + (DB.crmOverview.leadFunnel.find((f: any) => f.status === 'PROPOSAL')?.count ?? 0),
        DB.crmOverview.leadFunnel.find((f: any) => f.status === 'NEGOTIATION')?.count ?? 0,
        DB.crmOverview.leadFunnel.find((f: any) => f.status === 'WON')?.count ?? 0,
        DB.crmOverview.leadFunnel.find((f: any) => f.status === 'LOST')?.count ?? 0,
      ]
      : stages.map(s => DB.leads.filter((l: any) => l.stage === s).length);

    body.innerHTML = `<div class="grid grid-3">
    <div class="stat-card"><div class="stat-bar" style="background:var(--accent)"></div><div class="stat-label">Total leads</div><div class="stat-row"><span class="stat-num" data-target="${totalLeads}">0</span></div></div>
    <div class="stat-card"><div class="stat-bar" style="background:var(--success)"></div><div class="stat-label">Conversion rate</div><div class="stat-row"><span class="stat-num" data-target="${conversionRate}">0</span><span class="faint">%</span></div></div>
    <div class="stat-card"><div class="stat-bar" style="background:var(--info)"></div><div class="stat-label">Calls today</div><div class="stat-row"><span class="stat-num" data-target="${callsToday}">0</span></div></div>
  </div>
  <div class="card" style="margin-top:14px;"><div class="card-title">Lead funnel</div>${svgBarChart(stages.map(s => s.slice(0, 4)), funnelCounts, 'var(--accent)')}</div>`;
    mountAnimations();
  } else if (tab === 'calls') {
    body.innerHTML = `<div class="toolbar"><div class="toolbar-search">${ic('search')}<input placeholder="Search customer…" data-table-search="calls" value="${escapeHtml(crmCallsServerState.search)}"></div><div class="spacer"></div><span class="chip" id="calls-count-chip">${ic('phone')} ${crmCallsServerState.total} calls</span></div><div id="tbl-calls"><div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading calls from server…</div></div>`;
    registerTable('calls', () => renderCrmCallsTable());
    fetchCrmCallsServer();
  } else if (tab === 'history') {
    body.innerHTML = `<div class="toolbar"><div class="toolbar-search">${ic('search')}<input placeholder="Search lead name…" data-table-search="leads" value="${escapeHtml(crmLeadsServerState.search)}"></div><div class="spacer"></div><span class="chip" id="leads-count-chip">${ic('users')} ${crmLeadsServerState.total} leads</span></div><div id="tbl-leads"><div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading leads from server…</div></div>`;
    registerTable('leads', () => renderCrmLeadsTable());
    fetchCrmLeadsServer();
  }
}

export function renderCrmRoute(params?: any[]) {
  const tab = params && params[0] ? params[0] : 'overview';
  const view = $('view');
  if (!view) return;
  view.innerHTML = `
    <div class="page-head"><div><h1>CRM activity</h1><p>Read-through visibility into leads, calls and conversion — owned operationally by the CRM workspace.</p></div></div>
    <div class="tabs">${crmTabs.map(t => `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="crm" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
    <div id="crm-body"></div>
  `;
  renderCrmTab(tab);

  if (tab === 'overview') {
    syncCrmOverview().then(() => { renderCrmTab('overview'); });
  }
}

registerRoute('crm', renderCrmRoute);

registerActions({
  'page-crm-calls': (el: any) => {
    if (crmCallsServerState.loading) return;
    const dir = el.dataset.dir;
    const current = crmCallsServerState.page || 1;
    const next = dir === 'next' ? current + 1 : current - 1;
    if (next >= 1 && next <= crmCallsServerState.totalPages) {
      fetchCrmCallsServer(next);
    }
  },
  'page-crm-leads': (el: any) => {
    if (crmLeadsServerState.loading) return;
    const dir = el.dataset.dir;
    const current = crmLeadsServerState.page || 1;
    const next = dir === 'next' ? current + 1 : current - 1;
    if (next >= 1 && next <= crmLeadsServerState.totalPages) {
      fetchCrmLeadsServer(next);
    }
  },
  'retry-crm-tab': (el: any) => {
    if (el.dataset.tab === 'calls') fetchCrmCallsServer();
    else if (el.dataset.tab === 'history') fetchCrmLeadsServer();
  },
});

export default function CrmActivity() {
  React.useEffect(() => {
    renderCrmRoute();
  }, []);

  return (
    <div id="crm-root">
      <div id="view"></div>
    </div>
  );
}
