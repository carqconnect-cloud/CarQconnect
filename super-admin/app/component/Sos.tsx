'use client';

import React, { useEffect } from 'react';
import {
  $,
  ic,
  escapeHtml,
  fmtDateTime,
  timeAgo,
  statusBadge,
  badge,
  avatarChip,
  renderEmpty,
  renderSkeletonTable,
  openDrawer,
  showToast,
  afterMutation,
  registerTable,
  refreshTable,
  buildTable,
  tableState,
  initials,
  apiClient,
  DB,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export const sosTabs = [
  { key: 'active', label: 'Active incidents' },
  { key: 'history', label: 'History' },
];

/* =========================================================================
   ENTITY MAPPER
========================================================================= */
export function mapSosFromApi(s: any) {
  if (!s) return null;
  return {
    id: s.id,
    userId: s.userId || s.user?.id || s.raw?.userId,
    userName: s.userName || (s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : '') || 'User',
    userEmail: s.userEmail || s.user?.email || null,
    userPhone: s.userPhone || s.user?.phone || null,
    vehicleReg: s.vehicleReg || s.vehicle?.registrationNumber || '—',
    lat: s.lat ? String(s.lat) : '22.7196',
    lng: s.lng ? String(s.lng) : '75.8577',
    address: s.address || null,
    status: (s.status || 'pending').toLowerCase(),
    createdAt: new Date(s.createdAt).getTime(),
    contactsNotified: s.contactsNotified || [],
    timeline: s.timeline || [{ label: 'SOS triggered', ts: new Date(s.createdAt).getTime() }],
    raw: s,
  };
}

/* =========================================================================
   SERVER SYNCHRONIZER
========================================================================= */
export async function syncSosEvents(query: any = {}) {
  if (!apiClient.getToken()) return DB.sosEvents || [];
  const res: any = await apiClient.get('/admin/sos', { page: 1, limit: 100, ...query });
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.sosEvents = rawItems.map(mapSosFromApi).filter(Boolean);
  return DB.sosEvents;
}

/* =========================================================================
   RADAR VISUALIZATION
========================================================================= */
export function renderRadar(events: any[]) {
  const colors: Record<string, string> = {
    pending: 'var(--warning)',
    acknowledged: 'var(--info)',
    escalated: 'var(--danger)',
    resolved: 'var(--success)',
  };
  const pins = events
    .map((e) => {
      let h = 0;
      for (const c of e.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const angle = (h % 360) * (Math.PI / 180);
      const radius = 24 + ((h >> 3) % 68);
      const x = 90 + Math.cos(angle) * radius,
        y = 90 + Math.sin(angle) * radius;
      return `<circle cx="${x}" cy="${y}" r="5" fill="${colors[e.status] || 'var(--text-faint)'}" stroke="var(--surface)" stroke-width="1.5" style="cursor:pointer" data-action="view-sos" data-id="${e.id}"><title>${escapeHtml(e.userName)}</title></circle>`;
    })
    .join('');
  return `<svg viewBox="0 0 180 180" width="180" height="180">
    <circle cx="90" cy="90" r="80" fill="none" stroke="var(--border)"/>
    <circle cx="90" cy="90" r="55" fill="none" stroke="var(--border)"/>
    <circle cx="90" cy="90" r="28" fill="none" stroke="var(--border)"/>
    <line x1="90" y1="10" x2="90" y2="170" stroke="var(--border)"/>
    <line x1="10" y1="90" x2="170" y2="90" stroke="var(--border)"/>
    ${pins}
  </svg>`;
}

/* =========================================================================
   DRAWER
========================================================================= */
export async function openSosDrawer(id: string) {
  const head = `<div class="drawer-head"><div><h3>SOS Incident</h3><div class="muted mono" style="font-size:12.5px;margin-top:2px;">Loading…</div></div>
  <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
  openDrawer(head, [{ key: 'overview', label: 'Overview' }], 'overview', () => '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading incident details…</div>');

  try {
    const s: any = await apiClient.get(`/admin/sos/${id}`);
    const liveHead = `<div class="drawer-head"><div><h3>${escapeHtml(s.userName || (s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() : 'User'))}</h3><div class="muted mono" style="font-size:12.5px;margin-top:2px;">${s.vehicleReg || '—'} · ${statusBadge(s.status ? s.status.toLowerCase() : 'pending')}</div></div>
    <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    const tabs = [
      { key: 'overview', label: 'Overview' },
      { key: 'contacts', label: 'Contacts' },
      { key: 'timeline', label: 'Timeline' },
    ];
    const contacts = s.contactsNotified || [];
    const timeline = s.timeline || [{ label: 'SOS triggered', ts: new Date(s.createdAt).getTime() }];
    const curStatus = (s.status || '').toLowerCase();

    function render(tab: string) {
      if (tab === 'overview') {
        const latF = parseFloat(s.lat || s.latitude || '22.7196') || 22.7196;
        const lngF = parseFloat(s.lng || s.longitude || '75.8577') || 75.8577;
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lngF - 0.015}%2C${latF - 0.015}%2C${lngF + 0.015}%2C${latF + 0.015}&layer=mapnik&marker=${latF}%2C${lngF}`;
        const gmapsUrl = `https://www.google.com/maps?q=${latF},${lngF}`;
        return `<div class="kv-grid">
        <div class="kv"><span class="k">Raised</span><span class="v">${fmtDateTime(new Date(s.createdAt).getTime())}</span></div>
        <div class="kv"><span class="k">Status</span><span class="v">${statusBadge(curStatus)}</span></div>
        <div class="kv"><span class="k">Vehicle Reg</span><span class="v mono">${s.vehicleReg || '—'}</span></div>
        <div class="kv"><span class="k">Coordinates</span><span class="v mono">${latF.toFixed(5)}, ${lngF.toFixed(5)}</span></div>
        ${s.address ? `<div class="kv" style="grid-column:span 2;"><span class="k">Address</span><span class="v">${escapeHtml(s.address)}</span></div>` : ''}
        </div>
        <div style="margin:14px 0 10px;">
          <iframe src="${mapUrl}" style="width:100%;height:230px;border:none;border-radius:8px;display:block;" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>
          <a href="${gmapsUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:12px;color:var(--primary);text-decoration:none;">${ic('externalLink')} Open in Google Maps</a>
        </div>
        <div class="divider"></div>
        <div class="hstack" style="flex-wrap:wrap;">
          ${curStatus === 'pending' ? `<button class="btn btn-sm btn-primary" data-action="sos-ack" data-id="${s.id}">Acknowledge</button>` : ''}
          ${curStatus !== 'escalated' && curStatus !== 'resolved' ? `<button class="btn btn-sm btn-danger" data-action="sos-escalate" data-id="${s.id}">Escalate</button>` : ''}
          ${curStatus !== 'resolved' ? `<button class="btn btn-sm" data-action="sos-resolve" data-id="${s.id}">Mark resolved</button>` : ''}
        </div>`;
      }
      if (tab === 'contacts') {
        return contacts.length
          ? `<div class="list-simple">${contacts
              .map(
                (c: any) => {
                  const isAck = c.isAcknowledged || c.acknowledged;
                  return `<div class="list-simple-row">
            <div><div style="font-weight:600;font-size:13px;">${escapeHtml(c.name || c.relationship || 'Emergency Contact')}</div><div class="cell-sub mono">+91 ${c.phone}</div></div>
            <div class="hstack">${isAck ? badge('Acknowledged', 'success') : badge('Notified', 'warning')}
            ${!isAck ? `<button class="btn btn-sm btn-ghost" data-action="notify-again" data-id="${s.id}" data-contact-id="${c.id || c.phone}" data-contact="${c.id || c.phone}">Notify again</button>` : ''}</div>
          </div>`;
                },
              )
              .join('')}</div>`
          : renderEmpty('No contacts notified', 'No emergency contacts were linked to this user.', 'bell');
      }
      if (tab === 'timeline') {
        return `<div class="timeline">${timeline
          .map(
            (t: any) => `<div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><b>${escapeHtml(t.label || t.title || 'Event')}</b><div class="tl-time">${t.ts ? fmtDateTime(t.ts) : t.createdAt ? fmtDateTime(new Date(t.createdAt).getTime()) : '—'}</div></div></div>`,
          )
          .join('')}</div>`;
      }
      return '';
    }
    openDrawer(liveHead, tabs, 'overview', render);
  } catch (err: any) {
    const errHead = `<div class="drawer-head"><div><h3>Error</h3></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    openDrawer(errHead, [{ key: 'error', label: 'Error' }], 'error', () => `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load incident details: ${escapeHtml(err.message)}</div>`);
  }
}

/* =========================================================================
   USER-WISE SOS GROUPING
========================================================================= */
export let sosViewMode: 'user' | 'table' = 'user';
export let currentSosTab: string = 'active';
export const openSosUserCards = new Set<string>();

export function buildUserWiseSosHtml(events: any[], search: string = ''): string {
  let list = events || [];

  if (search) {
    const q = search.toLowerCase();
    list = list.filter((e) => {
      const uName = (e.userName || '').toLowerCase();
      const uEmail = (e.userEmail || '').toLowerCase();
      const uPhone = (e.userPhone || '').toLowerCase();
      const vReg = (e.vehicleReg || '').toLowerCase();
      const st = (e.status || '').toLowerCase();
      const addr = (e.address || '').toLowerCase();
      const id = (e.id || '').toLowerCase();
      return (
        uName.includes(q) ||
        uEmail.includes(q) ||
        uPhone.includes(q) ||
        vReg.includes(q) ||
        st.includes(q) ||
        addr.includes(q) ||
        id.includes(q)
      );
    });
  }

  if (!list.length) {
    return renderEmpty(
      'No incidents match',
      'Try adjusting your search terms or filter to see more results.',
      'alert',
    );
  }

  // Group incidents by user
  const userMap = new Map<
    string,
    {
      key: string;
      name: string;
      email: string | null;
      phone: string | null;
      events: any[];
    }
  >();

  for (const e of list) {
    const key = (e.userId || e.userEmail || e.userName || 'unknown').toLowerCase();
    let entry = userMap.get(key);
    if (!entry) {
      entry = {
        key,
        name: e.userName || 'Unknown User',
        email: e.userEmail || null,
        phone: e.userPhone || null,
        events: [],
      };
      userMap.set(key, entry);
    }
    entry.events.push(e);
  }

  const users = Array.from(userMap.values());

  // Sort: users with pending/escalated alerts first, then newest incidents
  users.sort((a, b) => {
    const aUrgent = a.events.some((e) => e.status === 'pending' || e.status === 'escalated');
    const bUrgent = b.events.some((e) => e.status === 'pending' || e.status === 'escalated');
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    const aLatest = Math.max(...a.events.map((e) => e.createdAt || 0));
    const bLatest = Math.max(...b.events.map((e) => e.createdAt || 0));
    return bLatest - aLatest;
  });

  return `
    <div class="user-wise-sos-list" style="display:flex;flex-direction:column;gap:18px;">
      ${users
        .map((u) => {
          // Sort each user's incidents newest first
          u.events.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

          const totalCount = u.events.length;
          const pendingCount = u.events.filter((e) => e.status === 'pending').length;
          const escalatedCount = u.events.filter((e) => e.status === 'escalated').length;
          const acknowledgedCount = u.events.filter((e) => e.status === 'acknowledged').length;
          const resolvedCount = u.events.filter((e) => e.status === 'resolved').length;
          const isUrgent = pendingCount > 0 || escalatedCount > 0;
          const isOpen = openSosUserCards.has(u.key);

          return `
            <div class="card user-card" data-user-key="${escapeHtml(u.key)}" style="padding:0;border-radius:16px;border:1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.35)' : 'var(--border)'};background:var(--surface);box-shadow:var(--shadow);overflow:hidden;">
              <!-- User Header Block (Click to Open / Close) -->
              <div class="user-card-header" data-action="toggle-sos-user-card" data-key="${escapeHtml(u.key)}" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;user-select:none;transition:background 0.15s ease;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div class="avatar" style="width:44px;height:44px;border-radius:50%;background:${isUrgent ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #3b82f6, #6366f1)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;box-shadow:${isUrgent ? '0 4px 12px rgba(239, 68, 68, 0.35)' : '0 4px 10px rgba(59, 130, 246, 0.25)'};">
                    ${initials(u.name)}
                  </div>
                  <div>
                    <div style="font-size:16px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">
                      ${escapeHtml(u.name)}
                      ${isUrgent ? `<span class="badge badge-danger" style="font-size:11px;font-weight:700;padding:2px 8px;">Active Alert</span>` : ''}
                    </div>
                    <div class="cell-sub" style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">
                      ${u.email ? `<span>${escapeHtml(u.email)}</span>` : ''}
                      ${u.phone ? `<span>${u.email ? ' · ' : ''}${escapeHtml(u.phone)}</span>` : ''}
                      ${!u.email && !u.phone ? '<span class="faint">Registered User</span>' : ''}
                    </div>
                  </div>
                </div>

                <!-- Incident Count Badges & Toggle Button -->
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span class="badge" style="background:rgba(239, 68, 68, 0.12);color:#ef4444;font-weight:700;font-size:12px;padding:4px 10px;border:1px solid rgba(239, 68, 68, 0.25);">
                    ${ic('alert')} ${totalCount} ${totalCount === 1 ? 'SOS Incident' : 'SOS Incidents'}
                  </span>
                  ${pendingCount > 0 ? `<span class="badge" style="background:rgba(245, 158, 11, 0.15);color:#d97706;font-size:11.5px;font-weight:600;border:1px solid rgba(245, 158, 11, 0.3);">${pendingCount} Pending</span>` : ''}
                  ${escalatedCount > 0 ? `<span class="badge badge-danger" style="font-size:11.5px;font-weight:600;">${escalatedCount} Escalated</span>` : ''}
                  ${acknowledgedCount > 0 ? `<span class="badge badge-info" style="font-size:11.5px;font-weight:600;">${acknowledgedCount} Acknowledged</span>` : ''}
                  ${resolvedCount > 0 ? `<span class="badge badge-success" style="font-size:11.5px;font-weight:600;">${resolvedCount} Resolved</span>` : ''}

                  <span class="btn btn-sm btn-ghost user-card-toggle-btn" style="padding:4px 10px;font-size:12px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:8px;margin-left:4px;pointer-events:none;">
                    <span class="user-card-toggle-text">${isOpen ? 'Hide' : 'View'}</span>
                    <span class="user-card-chevron" style="display:inline-flex;align-items:center;transition:transform 0.2s ease;transform:${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};">${ic('chevDown')}</span>
                  </span>
                </div>
              </div>

              <!-- Collapsible Sub-Table Container (Closed by default) -->
              <div class="user-card-body" style="display:${isOpen ? 'block' : 'none'};padding:0 20px 20px;border-top:1px solid var(--border);background:var(--surface);">
                <div style="height:14px;"></div>
                <div class="table-wrap" style="border:1px solid var(--border);border-radius:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:var(--bg);">
                  <table class="dtable" style="margin:0;width:100%;">
                    <thead>
                      <tr style="background:var(--surface);">
                        <th>Vehicle</th>
                        <th>Status</th>
                        <th>Coordinates / Location</th>
                        <th>Contacts</th>
                        <th>Raised</th>
                        <th style="text-align:right;">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${u.events
                        .map((e) => {
                          const latF = parseFloat(e.lat || '22.7196') || 22.7196;
                          const lngF = parseFloat(e.lng || '75.8577') || 75.8577;
                          const gmapsUrl = `https://www.google.com/maps?q=${latF},${lngF}`;
                          const cCount = e.contactsNotified ? e.contactsNotified.length : 0;
                          return `
                            <tr class="row-click" data-action="view-sos" data-id="${e.id}">
                              <td>
                                <div style="font-family:monospace;font-weight:700;color:var(--text);font-size:13.5px;">${escapeHtml(e.vehicleReg || '—')}</div>
                              </td>
                              <td>
                                ${statusBadge(e.status)}
                              </td>
                              <td>
                                <div style="display:flex;align-items:center;gap:6px;">
                                  <span class="mono" style="font-size:12px;">${latF.toFixed(4)}, ${lngF.toFixed(4)}</span>
                                  <a href="${gmapsUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="display:inline-flex;color:var(--primary);align-items:center;" title="Open in Maps">
                                    ${ic('externalLink')}
                                  </a>
                                </div>
                                ${e.address ? `<div class="cell-sub" style="font-size:11px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(e.address)}</div>` : ''}
                              </td>
                              <td>
                                <span class="badge badge-neutral" style="font-size:11.5px;">${cCount} notified</span>
                              </td>
                              <td>
                                <div style="font-weight:600;font-size:12.5px;color:var(--text);">${timeAgo(e.createdAt)}</div>
                                <div class="cell-sub" style="font-size:11px;color:var(--text-muted);">${fmtDateTime(e.createdAt)}</div>
                              </td>
                              <td style="text-align:right;">
                                <button class="btn btn-sm ${e.status === 'pending' || e.status === 'escalated' ? 'btn-primary' : 'btn-ghost'}" data-action="view-sos" data-id="${e.id}" style="padding:4px 10px;font-size:12px;">
                                  ${ic('eye')} Manage
                                </button>
                              </td>
                            </tr>
                          `;
                        })
                        .join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

/* =========================================================================
   TABS & ROUTE VIEW RENDERER
========================================================================= */
export function renderSosTab(tab: string) {
  currentSosTab = tab;
  const body = $('sos-body');
  if (!body) return;
  const active = (DB.sosEvents || []).filter((s: any) => s.status !== 'resolved');
  const resolved = (DB.sosEvents || []).filter((s: any) => s.status === 'resolved');

  if (tab === 'active') {
    const st = tableState('sos');
    const uniqueUsers = new Set(active.map((s: any) => s.userId || s.userEmail || s.userName)).size;

    const cols = [
      { key: 'userName', label: 'User', sortable: true, render: (r: any) => avatarChip(r.userName) },
      { key: 'vehicleReg', label: 'Vehicle', sortable: false, render: (r: any) => `<span class="mono">${escapeHtml(r.vehicleReg)}</span>` },
      { key: 'status', label: 'Status', sortable: true, render: (r: any) => statusBadge(r.status) },
      { key: 'createdAt', label: 'Raised', sortable: true, render: (r: any) => timeAgo(r.createdAt) },
    ];

    body.innerHTML = `
      <div class="toolbar" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
        <div class="toolbar-search">
          ${ic('search')}<input placeholder="Search user, vehicle reg, address, status…" data-table-search="sos" value="${escapeHtml(st.search)}">
        </div>

        <!-- View Mode Switcher -->
        <div class="view-switch">
          <button class="btn btn-sm ${sosViewMode === 'user' ? 'btn-primary' : 'btn-ghost'}" data-action="set-sos-view" data-mode="user">
            ${ic('users')} User-wise
          </button>
          <button class="btn btn-sm ${sosViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" data-action="set-sos-view" data-mode="table">
            ${ic('grid')} All Incidents
          </button>
        </div>

        <div class="spacer"></div>
        <span class="chip" id="sos-count-chip">
          ${ic('alert')} ${uniqueUsers} ${uniqueUsers === 1 ? 'user' : 'users'} · ${active.length} active
        </span>
      </div>

      <div style="margin-top:14px;" id="tbl-sos"></div>
    `;

    registerTable('sos', () => {
      const currentSt = tableState('sos');
      if (sosViewMode === 'user') {
        return buildUserWiseSosHtml(active, currentSt.search);
      }
      return buildTable('sos', cols, active, {
        onRowClick: 'view-sos',
        perPage: 8,
        emptyTitle: 'No active incidents',
        emptyBody: 'All clear — no pending or escalated SOS events right now.',
      });
    });
    refreshTable('sos');
  } else {
    const st = tableState('sos-hist');
    const uniqueUsers = new Set(resolved.map((s: any) => s.userId || s.userEmail || s.userName)).size;

    const cols = [
      { key: 'userName', label: 'User', sortable: true, render: (r: any) => avatarChip(r.userName) },
      { key: 'vehicleReg', label: 'Vehicle', sortable: false, render: (r: any) => `<span class="mono">${escapeHtml(r.vehicleReg)}</span>` },
      { key: 'createdAt', label: 'Raised', sortable: true, render: (r: any) => fmtDateTime(r.createdAt) },
      { key: 'status', label: 'Status', sortable: true, render: (r: any) => statusBadge(r.status) },
    ];

    body.innerHTML = `
      <div class="toolbar" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
        <div class="toolbar-search">
          ${ic('search')}<input placeholder="Search user, vehicle reg, address…" data-table-search="sos-hist" value="${escapeHtml(st.search)}">
        </div>

        <!-- View Mode Switcher -->
        <div class="view-switch">
          <button class="btn btn-sm ${sosViewMode === 'user' ? 'btn-primary' : 'btn-ghost'}" data-action="set-sos-view" data-mode="user">
            ${ic('users')} User-wise
          </button>
          <button class="btn btn-sm ${sosViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" data-action="set-sos-view" data-mode="table">
            ${ic('grid')} All Incidents
          </button>
        </div>

        <div class="spacer"></div>
        <span class="chip" id="sos-hist-count-chip">
          ${ic('check')} ${uniqueUsers} ${uniqueUsers === 1 ? 'user' : 'users'} · ${resolved.length} resolved
        </span>
      </div>

      <div style="margin-top:14px;" id="tbl-sos-hist"></div>
    `;

    registerTable('sos-hist', () => {
      const currentSt = tableState('sos-hist');
      if (sosViewMode === 'user') {
        return buildUserWiseSosHtml(resolved, currentSt.search);
      }
      return buildTable('sos-hist', cols, resolved, {
        onRowClick: 'view-sos',
        perPage: 9,
        emptyTitle: 'No resolved incidents yet',
        emptyBody: 'Closed incidents will show up here.',
      });
    });
    refreshTable('sos-hist');
  }
}

export function renderSosView(params?: any[]) {
  const tab = params && params[0] ? params[0] : 'active';
  currentSosTab = tab;
  const viewEl = $('view');
  if (!viewEl) return;

  const hasCachedData = Array.isArray(DB.sosEvents) && DB.sosEvents.length > 0;

  viewEl.innerHTML = `
    <div class="page-head"><div><h1>SOS incidents</h1><p>Live safety incidents raised from the app, family notification status and resolution.</p></div></div>
    <div class="tabs">${sosTabs.map((t) => `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="sos" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
    <div id="sos-body">${hasCachedData ? '' : renderSkeletonTable(5, 5)}</div>
  `;

  if (hasCachedData) {
    renderSosTab(tab);
  }

  syncSosEvents()
    .then(() => {
      renderSosTab(tab);
    })
    .catch((err) => {
      if (!hasCachedData) {
        const body = $('sos-body');
        if (body) {
          body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load SOS incidents</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-sos">Retry</button></div>`;
        }
      }
    });
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerSosSection() {
  registerRoute('sos', renderSosView);

  registerActions({
    'view-sos': (el: HTMLElement) => {
      if (el.dataset.id) openSosDrawer(el.dataset.id);
    },
    'set-sos-view': (el: HTMLElement) => {
      const mode = el.dataset.mode;
      if (mode === 'user' || mode === 'table') {
        sosViewMode = mode;
        renderSosTab(currentSosTab);
      }
    },
    'toggle-sos-user-card': (el: HTMLElement) => {
      const card = el.closest('.user-card') as HTMLElement;
      if (!card) return;
      const body = card.querySelector('.user-card-body') as HTMLElement;
      const chevron = card.querySelector('.user-card-chevron') as HTMLElement;
      const toggleText = card.querySelector('.user-card-toggle-text') as HTMLElement;
      const key = card.dataset.userKey;
      if (!body) return;
      const isClosed = body.style.display === 'none';
      body.style.display = isClosed ? 'block' : 'none';
      if (chevron) {
        chevron.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      if (toggleText) {
        toggleText.textContent = isClosed ? 'Hide' : 'View';
      }
      if (key) {
        if (isClosed) openSosUserCards.add(key);
        else openSosUserCards.delete(key);
      }
    },
    'sos-ack': async (el: any) => {
      const id = el.dataset.id;
      try {
        await apiClient.post(`/admin/sos/${encodeURIComponent(id)}/acknowledge`, {});
        afterMutation('Incident acknowledged.');
        await syncSosEvents();
        renderSosTab('active');
        openSosDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to acknowledge incident', 'danger');
      }
    },
    'sos-escalate': async (el: any) => {
      const id = el.dataset.id;
      try {
        await apiClient.post(`/admin/sos/${encodeURIComponent(id)}/escalate`, {});
        afterMutation('Incident escalated.', 'danger');
        await syncSosEvents();
        renderSosTab('active');
        openSosDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to escalate incident', 'danger');
      }
    },
    'sos-resolve': async (el: any) => {
      const id = el.dataset.id;
      try {
        await apiClient.post(`/admin/sos/${encodeURIComponent(id)}/resolve`, { notes: 'Resolved by Super Admin' });
        afterMutation('Incident resolved.');
        await syncSosEvents();
        renderSosTab('active');
        openSosDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to resolve incident', 'danger');
      }
    },
    'notify-again': async (el: any) => {
      const id = el.dataset.id;
      const contactId = el.dataset.contactId || el.dataset.contact || 'primary';
      try {
        await apiClient.post(`/admin/sos/${encodeURIComponent(id)}/contacts/${encodeURIComponent(contactId)}/notify-again`, {});
        showToast('Emergency contacts notified again.');
      } catch (err: any) {
        showToast(err.message || 'Failed to notify contacts', 'danger');
      }
    },
    'retry-sos': () => {
      syncSosEvents().then(() => renderSosView()).catch(() => renderSosView());
    },
  });
}

// Auto-register upon import
registerSosSection();

export default function Sos() {
  useEffect(() => {
    renderSosView();
  }, []);

  return <div id="sos-component-root" />;
}
