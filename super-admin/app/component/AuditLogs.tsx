'use client';

import React from 'react';
import {
  $,
  ic,
  escapeHtml,
  fmtDateTime,
  timeAgo,
  statusBadge,
  badge,
  renderEmpty,
  renderSkeletonTable,
  apiClient,
  DB,
  showToast,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export function mapAuditLogFromApi(l: any) {
  if (!l) return null;
  return {
    id: l.id,
    actorName: l.actorName || (l.actor ? `${l.actor.firstName || ''} ${l.actor.lastName || ''}`.trim() || l.actor.email : 'System'),
    actorEmail: l.actorEmail || l.actor?.email || '',
    actorRole: l.actorRole || (l.actor?.isSuperAdmin ? 'Super Admin' : 'Admin'),
    action: l.action || l.eventType || 'UNKNOWN',
    module: l.module || l.resource || 'System',
    targetId: l.targetId || l.resourceId || null,
    targetType: l.targetType || l.resourceType || null,
    ipAddress: l.ipAddress || l.ip || '—',
    status: (l.status || 'success').toLowerCase(),
    createdAt: new Date(l.createdAt || l.timestamp).getTime(),
    raw: l,
  };
}

export const auditLogsServerState = {
  page: 1, limit: 15, total: 0, totalPages: 1,
  loading: false, search: '', module: '', action: '', requestId: 0,
};

export async function fetchAuditLogs(targetPage?: number) {
  if (typeof targetPage === 'number') auditLogsServerState.page = Math.max(1, targetPage);
  const currentReqId = ++auditLogsServerState.requestId;
  auditLogsServerState.loading = true;
  const query: Record<string, any> = { page: auditLogsServerState.page, limit: auditLogsServerState.limit };
  if (auditLogsServerState.search) query.search = auditLogsServerState.search;
  if (auditLogsServerState.module) query.module = auditLogsServerState.module;
  if (auditLogsServerState.action) query.action = auditLogsServerState.action;
  try {
    const res: any = await apiClient.getWithMeta('/admin/audit-logs', query);
    if (currentReqId !== auditLogsServerState.requestId) return;
    auditLogsServerState.loading = false;
    const rawItems = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
    const pagination = res?.meta?.pagination || res?.meta;
    const total = typeof pagination?.total === 'number' ? pagination.total : rawItems.length;
    const totalPages = Math.max(1, typeof pagination?.totalPages === 'number' ? pagination.totalPages : Math.ceil(total / auditLogsServerState.limit));
    auditLogsServerState.total = total;
    auditLogsServerState.totalPages = totalPages;
    (DB as any).auditLogs = rawItems.map(mapAuditLogFromApi).filter(Boolean);
    renderAuditLogsTable();
    const chip = $('audit-logs-count-chip');
    if (chip) chip.innerHTML = `${ic('book')} ${total} events`;
  } catch (err: any) {
    if (currentReqId !== auditLogsServerState.requestId) return;
    auditLogsServerState.loading = false;
    const tbl = $('audit-logs-table-wrap');
    if (tbl) tbl.innerHTML = `<div class="card p-6" style="margin:16px 0;border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load audit logs</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message || 'API error')}</p><button class="btn btn-sm btn-ghost" data-action="retry-audit-logs">Retry</button></div>`;
  }
}

function actionBadge(action: string): string {
  const a = String(action || '').toUpperCase();
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('SUSPEND')) return badge(action, 'danger');
  if (a.includes('CREATE') || a.includes('ADD') || a.includes('REGISTER')) return badge(action, 'success');
  if (a.includes('UPDATE') || a.includes('EDIT') || a.includes('PATCH')) return badge(action, 'info');
  if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('AUTH')) return badge(action, 'warning');
  return badge(action, 'neutral');
}

function moduleBadge(module: string): string {
  const colors: Record<string, string> = { Users: 'info', Vehicles: 'warning', QR: 'neutral', GPS: 'neutral', Orders: 'success', Inventory: 'info', Membership: 'success', SOS: 'danger', Support: 'warning', AI: 'info', CRM: 'neutral', Content: 'neutral', Reports: 'neutral', Roles: 'warning', System: 'neutral' };
  return badge(module, colors[module] || 'neutral');
}

export function renderAuditLogsTable() {
  const tbl = $('audit-logs-table-wrap');
  if (!tbl) return;
  const rows = (DB as any).auditLogs || [];
  const { total, page, limit: perPage, totalPages, loading } = auditLogsServerState;
  if (!rows.length) { tbl.innerHTML = renderEmpty('No audit events found', 'Audit events will appear here as admin actions are performed.', 'book'); return; }
  const head = ['Time', 'Admin', 'Role', 'Module', 'Action', 'Target', 'IP Address', 'Status'].map(l => `<th>${l}</th>`).join('');
  const body = rows.map((r: any) => `<tr style="cursor:default;">
    <td><div style="font-size:12.5px;font-weight:600;">${fmtDateTime(r.createdAt)}</div><div class="muted" style="font-size:11px;">${timeAgo(r.createdAt)}</div></td>
    <td><div style="font-weight:600;font-size:13px;">${escapeHtml(r.actorName)}</div><div class="muted mono" style="font-size:11px;">${escapeHtml(r.actorEmail)}</div></td>
    <td><span class="badge badge-neutral" style="font-size:10.5px;">${escapeHtml(r.actorRole)}</span></td>
    <td>${moduleBadge(r.module)}</td>
    <td>${actionBadge(r.action)}</td>
    <td>${r.targetId ? `<span class="mono" style="font-size:11.5px;">${escapeHtml(r.targetType ? r.targetType + ':' : '')}${escapeHtml(String(r.targetId).slice(0,10))}…</span>` : '<span class="faint">—</span>'}</td>
    <td><span class="mono" style="font-size:11.5px;">${escapeHtml(r.ipAddress)}</span></td>
    <td>${statusBadge(r.status === 'success' ? 'active' : 'suspended')}</td>
  </tr>`).join('');
  const from = total > 0 ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);
  tbl.innerHTML = `<div class="table-wrap"><table class="dtable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><div class="pager"><span>Showing ${from}–${to} of ${total} events</span><div class="pager-btns"><button class="btn-icon" data-action="page-audit-logs" data-dir="prev" ${page <= 1 || loading ? 'disabled' : ''}>${ic('arrowLeft')}</button><span class="pager-page">Page ${page} / ${totalPages}</span><button class="btn-icon" data-action="page-audit-logs" data-dir="next" ${page >= totalPages || loading ? 'disabled' : ''}>${ic('chevRight')}</button></div></div>`;
}

const AUDIT_MODULES = ['Users','Vehicles','QR','GPS','Orders','Inventory','Membership','SOS','Support','AI','CRM','Content','Reports','Roles','System'];
const AUDIT_ACTIONS = ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','SUSPEND','ACTIVATE','ASSIGN','UNBIND','EXPORT'];

export function renderAuditLogsRoute() {
  const view = $('view');
  if (!view) return;
  auditLogsServerState.page = 1; auditLogsServerState.search = ''; auditLogsServerState.module = ''; auditLogsServerState.action = '';
  view.innerHTML = `
    <div class="page-head">
      <div><h1>Audit Logs</h1><p>Complete trail of every admin action — who did what, when, from where.</p></div>
      <div class="page-head-actions"><button class="btn btn-sm btn-ghost" data-action="export-audit-logs">${ic('download')} Export CSV</button></div>
    </div>
    <div class="toolbar" style="flex-wrap:wrap;gap:8px;">
      <div class="toolbar-search">${ic('search')}<input id="audit-search-input" placeholder="Search admin, action, module…" style="min-width:200px;"></div>
      <select id="audit-module-filter"><option value="">All modules</option>${AUDIT_MODULES.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
      <select id="audit-action-filter"><option value="">All actions</option>${AUDIT_ACTIONS.map(a => `<option value="${a}">${a}</option>`).join('')}</select>
      <div class="spacer"></div>
      <span class="chip" id="audit-logs-count-chip">${ic('book')} Loading…</span>
    </div>
    <div id="audit-logs-table-wrap" style="margin-top:4px;">${Array.isArray((DB as any).auditLogs) && (DB as any).auditLogs.length > 0 ? '' : renderSkeletonTable(6, 5)}</div>
  `;
  if (Array.isArray((DB as any).auditLogs) && (DB as any).auditLogs.length > 0) {
    renderAuditLogsTable();
  }
  const searchInput = $('audit-search-input') as HTMLInputElement;
  if (searchInput) {
    let t: any;
    searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { auditLogsServerState.search = searchInput.value.trim(); auditLogsServerState.page = 1; fetchAuditLogs(); }, 300); });
    searchInput.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') { clearTimeout(t); auditLogsServerState.search = searchInput.value.trim(); auditLogsServerState.page = 1; fetchAuditLogs(); } });
  }
  const modF = $('audit-module-filter') as HTMLSelectElement;
  if (modF) modF.addEventListener('change', () => { auditLogsServerState.module = modF.value; auditLogsServerState.page = 1; fetchAuditLogs(); });
  const actF = $('audit-action-filter') as HTMLSelectElement;
  if (actF) actF.addEventListener('change', () => { auditLogsServerState.action = actF.value; auditLogsServerState.page = 1; fetchAuditLogs(); });
  fetchAuditLogs();
}

registerRoute('audit-logs', renderAuditLogsRoute);

registerActions({
  'page-audit-logs': (el: HTMLElement) => {
    if (auditLogsServerState.loading) return;
    const dir = el.dataset.dir; const curr = auditLogsServerState.page;
    const next = dir === 'next' ? curr + 1 : curr - 1;
    if (next >= 1 && next <= auditLogsServerState.totalPages) fetchAuditLogs(next);
  },
  'retry-audit-logs': () => fetchAuditLogs(),
  'export-audit-logs': async (el: HTMLElement) => {
    const btn = el.closest('button') as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Exporting…'; }
    try {
      const csv: any = await apiClient.get('/admin/audit-logs/export');
      if (!csv || typeof csv !== 'string' || !csv.trim()) { showToast('No data to export yet.', 'danger'); return; }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      showToast('Audit log CSV exported.');
    } catch (e: any) {
      showToast('Export failed: ' + (e?.message || 'API error'), 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `${ic('download')} Export CSV`; }
    }
  },
});

export default function AuditLogs() {
  React.useEffect(() => { renderAuditLogsRoute(); }, []);
  return <div id="audit-logs-root" />;
}
