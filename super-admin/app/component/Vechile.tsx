'use client';

import React, { useEffect } from 'react';
import {
  $,
  ic,
  escapeHtml,
  fmtDate,
  statusBadge,
  badge,
  renderEmpty,
  renderSkeletonTable,
  openDrawer,
  tableState,
  registerTable,
  refreshTable,
  buildTable,
  apiClient,
  DB,
  initials,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export const FUELS = ['Petrol', 'Diesel', 'CNG', 'Electric'];

/* =========================================================================
   REMINDER CALCULATION & ENTITY MAPPER
========================================================================= */
export function computeVehicleReminder(v: any): { status: string; label: string; badgeType: string } {
  if (!v) return { status: 'NO_REMINDER', label: 'No reminder', badgeType: 'neutral' };

  const s = v.reminderStatus;
  if (s === 'EXPIRED') return { status: 'EXPIRED', label: 'Expired', badgeType: 'danger' };
  if (s === 'EXPIRING_SOON') return { status: 'EXPIRING_SOON', label: 'Expiring soon', badgeType: 'warning' };
  if (s === 'UP_TO_DATE') return { status: 'UP_TO_DATE', label: 'Up to date', badgeType: 'success' };
  if (s === 'NO_REMINDER') return { status: 'NO_REMINDER', label: 'No reminder', badgeType: 'neutral' };

  const raw = v.docExpiry;
  if (!raw) return { status: 'NO_REMINDER', label: 'No reminder', badgeType: 'neutral' };

  const target = typeof raw === 'number' ? raw : new Date(raw).getTime();
  if (!target || isNaN(target)) return { status: 'NO_REMINDER', label: 'No reminder', badgeType: 'neutral' };

  const now = Date.now();
  if (target < now) return { status: 'EXPIRED', label: 'Expired', badgeType: 'danger' };

  const diffDays = Math.ceil((target - now) / 86400000);
  if (diffDays <= 30) return { status: 'EXPIRING_SOON', label: 'Expiring soon', badgeType: 'warning' };
  return { status: 'UP_TO_DATE', label: 'Up to date', badgeType: 'success' };
}

export function mapVehicleFromApi(v: any) {
  if (!v) return null;
  return {
    id: v.id,
    reg: v.reg || v.regNumber || '—',
    model: v.model || v.name || '—',
    name: v.name,
    regNumber: v.regNumber,
    fuel: v.fuel || 'Petrol',
    ownerId: v.ownerId,
    ownerName: v.ownerName || '—',
    ownerEmail: v.ownerEmail || null,
    ownerPhone: v.ownerPhone || null,
    mileage: v.mileage ?? 15,
    qrLinked: Boolean(v.qrLinked || v.qrTag || v.qrCode),
    qrCode: v.qrCode,
    qrTag: v.qrTag,
    gpsLinked: Boolean(v.gpsLinked || v.gpsDevice),
    gpsDevice: v.gpsDevice,
    docExpiry: v.docExpiry,
    reminderStatus: v.reminderStatus,
    reminderLabel: v.reminderLabel,
    daysRemaining: v.daysRemaining,
    addedAt: new Date(v.addedAt || v.createdAt).getTime(),
    raw: v,
  };
}

/* =========================================================================
   SERVER SYNCHRONIZER
========================================================================= */
export async function syncVehicles(query: any = {}) {
  const res: any = await apiClient.get('/admin/vehicles', { page: 1, limit: 100, ...query });
  const rawItems = Array.isArray(res) ? res : (res?.items || res?.data || []);
  DB.vehicles = rawItems.map(mapVehicleFromApi).filter(Boolean);
  return DB.vehicles;
}

/* =========================================================================
   COLUMNS & TABLE
========================================================================= */
export function vehicleColumns() {
  return [
    { key: 'reg', label: 'Registration', sortable: true, render: (r: any) => `<div><div class="cell-primary mono">${escapeHtml(r.reg || r.regNumber || '—')}</div><div class="cell-sub">${escapeHtml(r.model || r.name || '')}</div></div>` },
    { key: 'ownerName', label: 'Owner', sortable: true },
    { key: 'fuel', label: 'Fuel', sortable: true },
    { key: 'qrLinked', label: 'QR', sortable: false, render: (r: any) => r.qrLinked ? badge('Linked', 'success') : badge('Not linked', 'neutral') },
    { key: 'gpsLinked', label: 'GPS', sortable: false, render: (r: any) => r.gpsLinked ? badge('Linked', 'info') : badge('Not linked', 'neutral') },
    { key: 'addedAt', label: 'Added', sortable: true, render: (r: any) => fmtDate(r.addedAt) },
  ];
}

export function fmtDocExpiry(val: any) {
  if (!val) return '<span class="faint">—</span>';
  const t = typeof val === 'number' ? val : new Date(val).getTime();
  if (!t || isNaN(t)) return '<span class="faint">—</span>';
  return fmtDate(t);
}

export function vehicleReminderBadge(v: any) {
  const r = computeVehicleReminder(v);
  return badge(r.label, r.badgeType);
}

/* =========================================================================
   DRAWER
========================================================================= */
export async function openVehicleDrawer(id: string) {
  const head = `<div class="drawer-head"><div><h3 class="mono">Vehicle Details</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">Loading data…</div></div>
  <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
  openDrawer(head, [{ key: 'overview', label: 'Overview' }], 'overview', () => '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading vehicle data…</div>');

  try {
    const v: any = await apiClient.get(`/admin/vehicles/${id}`);
    const displayReg = v.reg || v.regNumber || '—';
    const displayModel = v.model || v.name || 'Vehicle';
    const liveHead = `<div class="drawer-head"><div><h3 class="mono">${escapeHtml(displayReg)}</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">${escapeHtml(displayModel)} · Owner: ${escapeHtml(v.ownerName)}</div></div>
    <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    const tabs = [
      { key: 'overview', label: 'Overview' },
      { key: 'links', label: 'QR & GPS links' },
      { key: 'docs', label: 'Documents & reminders' },
      { key: 'activity', label: 'Activity' },
    ];
    function render(tab: string) {
      if (tab === 'overview') {
        return `<div class="kv-grid">
        <div class="kv"><span class="k">Model</span><span class="v">${escapeHtml(displayModel)}</span></div>
        <div class="kv"><span class="k">Registration</span><span class="v mono">${escapeHtml(displayReg)}</span></div>
        <div class="kv"><span class="k">Fuel type</span><span class="v">${v.fuel}</span></div>
        <div class="kv"><span class="k">Mileage</span><span class="v">${v.mileage || '—'} km/l</span></div>
        <div class="kv"><span class="k">Owner</span><span class="v">${escapeHtml(v.ownerName)}</span></div>
        <div class="kv"><span class="k">Added on</span><span class="v">${fmtDate(new Date(v.addedAt || v.createdAt).getTime())}</span></div>
        <div class="kv"><span class="k">Document expiry</span><span class="v">${fmtDocExpiry(v.docExpiry)}</span></div>
      </div>
      ${v.imagePath ? `<div style="margin-top:16px;text-align:center;"><img src="${v.imagePath.startsWith('http') || v.imagePath.startsWith('/') ? v.imagePath : '/' + v.imagePath}" alt="${escapeHtml(displayModel)}" style="max-height:120px;object-fit:contain;margin:0 auto;display:block;" onerror="this.style.display='none'" /></div>` : ''}`;
      }
      if (tab === 'links') {
        const qrCodeVal = v.qrCode?.code || v.qrTag?.tagId || v.links?.qr?.code || (v.qrLinked ? 'Linked' : null);
        const qrActive = v.qrTag ? v.qrTag.isActive : (v.qrCode ? v.qrCode.status === 'active' : v.qrLinked);
        return `<div class="drawer-section"><h5>QR code</h5>${qrCodeVal ? `<div class="list-simple-row" style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;"><div><div style="font-weight:600;font-size:14px;color:var(--text);font-family:IBM Plex Mono, monospace;">${escapeHtml(qrCodeVal)}</div><div class="muted" style="font-size:12px;margin-top:2px;">Smart QR Tag · Emergency Safety Sticker</div></div>${statusBadge(qrActive ? 'active' : 'suspended')}</div>${v.links?.qr?.callOwner ? '<div class="muted" style="font-size:11.5px;margin-top:6px;">✓ Call Owner enabled &nbsp;·&nbsp; ✓ Emergency SMS alert enabled</div>' : ''}` : renderEmpty('No QR linked', 'Activate a QR sticker from the QR module or mobile app to link it here.', 'qrcode')}</div>
        <div class="drawer-section" style="margin-top:16px;"><h5>GPS device</h5>${v.gpsLinked || v.gpsDevice || v.links?.gps?.linked ? `<div class="list-simple-row"><span class="mono">${v.gpsDevice?.imei || v.links?.gps?.imei || 'Linked'}</span>${statusBadge('active')}</div>` : renderEmpty('No GPS device linked', 'Assign a GPS device from the GPS module to link it here.', 'satellite')}</div>`;
      }
      if (tab === 'docs') {
        const docs = v.documents || [];
        const reminders = v.reminders || [];
        return `<div class="kv-grid"><div class="kv"><span class="k">RC / insurance expiry</span><span class="v">${fmtDocExpiry(v.docExpiry)}</span></div>
        <div class="kv"><span class="k">Reminder status</span><span class="v">${vehicleReminderBadge(v)}</span></div></div>
        <div class="drawer-section" style="margin-top:18px;"><h5>Registered documents (${docs.length})</h5>${docs.length ? `<div class="list-simple" style="display:flex;flex-direction:column;gap:8px;">${docs.map((d: any) => `<div class="list-simple-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;"><div><div style="font-weight:600;font-size:13px;color:var(--text);">${escapeHtml(d.title || d.type || 'Document')}</div><div class="muted mono" style="font-size:11.5px;">${escapeHtml(d.documentNumber || '—')}</div></div><div style="text-align:right;"><div style="font-size:12px;color:var(--text-sub);">${fmtDocExpiry(d.expiryDate)}</div>${d.frontImageUrl ? `<a href="${d.frontImageUrl}" target="_blank" style="font-size:11px;color:var(--primary);text-decoration:none;">View Image</a>` : ''}</div></div>`).join('')}</div>` : '<p class="muted" style="font-size:12.5px;">No uploaded documents.</p>'}</div>
        ${reminders.length ? `<div class="drawer-section" style="margin-top:18px;"><h5>Active Reminders (${reminders.length})</h5><div class="list-simple" style="display:flex;flex-direction:column;gap:8px;">${reminders.map((r: any) => `<div class="list-simple-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;"><div><div style="font-weight:600;font-size:13px;color:var(--text);">${escapeHtml(r.title)}</div><div class="muted" style="font-size:11.5px;">${escapeHtml(r.description || r.type || 'Reminder')}</div></div><div style="font-size:12px;color:var(--text-sub);">${fmtDate(new Date(r.date).getTime())}</div></div>`).join('')}</div></div>` : ''}`;
      }
      if (tab === 'activity') {
        const activities = v.activity || [];
        return `<div class="timeline">${activities.length ? activities.map((a: any) => `<div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><b>${escapeHtml(a.label || 'Vehicle Activity')}</b><p>By ${escapeHtml(a.actorName || v.ownerName)}</p><div class="tl-time">${fmtDate(new Date(a.createdAt).getTime())}</div></div></div>`).join('') : `<div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><b>Vehicle registered</b><p>By ${escapeHtml(v.ownerName)}</p><div class="tl-time">${fmtDate(new Date(v.addedAt || v.createdAt).getTime())}</div></div></div>`}</div>`;
      }
      return '';
    }
    openDrawer(liveHead, tabs, 'overview', render);
  } catch (err: any) {
    const errHead = `<div class="drawer-head"><div><h3>Error</h3></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    openDrawer(errHead, [{ key: 'error', label: 'Error' }], 'error', () => `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load vehicle details: ${escapeHtml(err.message)}</div>`);
  }
}

/* =========================================================================
   ROUTE VIEW RENDERER (USER-WISE & ALL VEHICLES MODES)
========================================================================= */
let vehicleViewMode: 'user' | 'table' = 'user';
export const openVehicleUserCards = new Set<string>();

export function buildUserWiseVehiclesHtml(vehicles: any[], search = '', fuelFilter = ''): string {
  let list = Array.isArray(vehicles) ? vehicles : [];

  if (fuelFilter) {
    list = list.filter((v: any) => v.fuel === fuelFilter);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (v: any) =>
        (v.reg && String(v.reg).toLowerCase().includes(q)) ||
        (v.model && String(v.model).toLowerCase().includes(q)) ||
        (v.ownerName && String(v.ownerName).toLowerCase().includes(q)) ||
        (v.ownerEmail && String(v.ownerEmail).toLowerCase().includes(q)) ||
        (v.ownerPhone && String(v.ownerPhone).toLowerCase().includes(q)),
    );
  }

  if (!list.length) {
    return renderEmpty(
      'No vehicles found',
      'Try adjusting your search terms or fuel filter to see more results.',
      'car',
    );
  }

  // Group vehicles by owner
  const ownerMap = new Map<
    string,
    {
      key: string;
      name: string;
      email: string | null;
      phone: string | null;
      vehicles: any[];
    }
  >();

  for (const v of list) {
    const key = (v.ownerId || v.ownerEmail || v.ownerName || 'unassigned').toLowerCase();
    let entry = ownerMap.get(key);
    if (!entry) {
      entry = {
        key,
        name: v.ownerName || 'Unknown Owner',
        email: v.ownerEmail || null,
        phone: v.ownerPhone || null,
        vehicles: [],
      };
      ownerMap.set(key, entry);
    }
    entry.vehicles.push(v);
  }

  const owners = Array.from(ownerMap.values());

  return `
    <div class="user-wise-vehicles-list" style="display:flex;flex-direction:column;gap:18px;">
      ${owners
        .map((o) => {
          const vCount = o.vehicles.length;
          const qrCount = o.vehicles.filter((v) => v.qrLinked).length;
          const gpsCount = o.vehicles.filter((v) => v.gpsLinked).length;
          const isOpen = openVehicleUserCards.has(o.key);

          return `
            <div class="card user-card" data-user-key="${escapeHtml(o.key)}" style="padding:0;border-radius:16px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow);overflow:hidden;">
              <!-- Owner Header Block (Click to Expand / Collapse) -->
              <div class="user-card-header" data-action="toggle-vehicle-user-card" data-key="${escapeHtml(o.key)}" style="cursor:pointer;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;user-select:none;transition:background 0.15s ease;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div class="avatar" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg, #3b82f6, #6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;box-shadow:0 4px 10px rgba(59, 130, 246, 0.25);">
                    ${initials(o.name)}
                  </div>
                  <div>
                    <div style="font-size:16px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">
                      ${escapeHtml(o.name)}
                    </div>
                    <div class="cell-sub" style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">
                      ${o.email ? `<span>${escapeHtml(o.email)}</span>` : ''}
                      ${o.phone ? `<span>${o.email ? ' · ' : ''}${escapeHtml(o.phone)}</span>` : ''}
                      ${!o.email && !o.phone ? '<span class="faint">Registered User Garage</span>' : ''}
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span class="badge" style="background:rgba(99, 102, 241, 0.12);color:#6366f1;font-weight:700;font-size:12px;padding:4px 10px;border:1px solid rgba(99, 102, 241, 0.2);">
                    ${ic('car')} ${vCount} ${vCount === 1 ? 'Vehicle' : 'Vehicles'}
                  </span>
                  ${qrCount > 0 ? `<span class="badge badge-success" style="font-size:11.5px;font-weight:600;">${qrCount} QR Linked</span>` : ''}
                  ${gpsCount > 0 ? `<span class="badge badge-info" style="font-size:11.5px;font-weight:600;">${gpsCount} GPS Linked</span>` : ''}

                  <span class="btn btn-sm btn-ghost user-card-toggle-btn" style="padding:4px 10px;font-size:12px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:8px;margin-left:4px;pointer-events:none;">
                    <span class="user-card-toggle-text">${isOpen ? 'Hide' : 'View'}</span>
                    <span class="user-card-chevron" style="display:inline-flex;align-items:center;transition:transform 0.2s ease;transform:${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};">${ic('chevDown')}</span>
                  </span>
                </div>
              </div>

              <!-- Owner's Vehicles Collapsible Container (Closed by default) -->
              <div class="user-card-body" style="display:${isOpen ? 'block' : 'none'};padding:0 20px 20px;border-top:1px solid var(--border);background:var(--surface);">
                <div style="height:14px;"></div>
                <div class="table-wrap" style="border:1px solid var(--border);border-radius:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:var(--bg);">
                  <table class="dtable" style="margin:0;width:100%;">
                    <thead>
                      <tr style="background:var(--surface);">
                        <th>Registration & Model</th>
                        <th>Fuel Type</th>
                        <th>QR Code</th>
                        <th>GPS Device</th>
                        <th>Added Date</th>
                        <th style="text-align:right;">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${o.vehicles
                        .map(
                          (v) => `
                        <tr class="row-click" data-action="view-vehicle" data-id="${v.id}">
                          <td>
                            <div style="font-family:monospace;font-weight:700;color:var(--text);font-size:13.5px;">${escapeHtml(v.reg)}</div>
                            <div class="cell-sub" style="font-size:12px;color:var(--text-muted);">${escapeHtml(v.model)}</div>
                          </td>
                          <td>
                            <span class="badge badge-neutral" style="font-size:11.5px;">${escapeHtml(v.fuel)}</span>
                          </td>
                          <td>
                            ${v.qrLinked ? badge('Linked', 'success') : badge('Not linked', 'neutral')}
                          </td>
                          <td>
                            ${v.gpsLinked ? badge('Linked', 'info') : badge('Not linked', 'neutral')}
                          </td>
                          <td style="font-size:12px;color:var(--text-muted);">
                            ${fmtDate(v.addedAt)}
                          </td>
                          <td style="text-align:right;">
                            <button class="btn btn-sm btn-ghost" data-action="view-vehicle" data-id="${v.id}" style="padding:4px 10px;font-size:12px;">
                              ${ic('eye')} View
                            </button>
                          </td>
                        </tr>
                      `,
                        )
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

export function renderVehicleView() {
  const st = tableState('vehicles');
  const viewEl = $('view');
  if (!viewEl) return;

  const hasCachedData = Array.isArray(DB.vehicles) && DB.vehicles.length > 0;
  const uniqueOwners = new Set(DB.vehicles.map((v: any) => v.ownerId || v.ownerEmail || v.ownerName)).size;

  viewEl.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Vehicles</h1>
        <p>Every vehicle in the Digital Garage, its QR/GPS linkage and document status grouped by owner.</p>
      </div>
    </div>
    <div class="toolbar" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
      <div class="toolbar-search">
        ${ic('search')}<input placeholder="Search reg no., model, owner…" data-table-search="vehicles" value="${escapeHtml(st.search)}">
      </div>

      <!-- View Mode Switcher -->
      <div class="view-switch">
        <button class="btn btn-sm ${vehicleViewMode === 'user' ? 'btn-primary' : 'btn-ghost'}" data-action="set-vehicle-view" data-mode="user">
          ${ic('users')} User-wise
        </button>
        <button class="btn btn-sm ${vehicleViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}" data-action="set-vehicle-view" data-mode="table">
          ${ic('grid')} All Vehicles
        </button>
      </div>

      <select data-table-filter="vehicles" data-filter-key="fuel">
        <option value="">All fuel types</option>
        ${FUELS.map((f) => `<option value="${f}" ${st.filters?.fuel === f ? 'selected' : ''}>${f}</option>`).join('')}
      </select>

      <div class="spacer"></div>
      <span class="chip" id="vehicles-count-chip">
        ${ic('car')} ${uniqueOwners} ${uniqueOwners === 1 ? 'owner' : 'owners'} · ${DB.vehicles.length} vehicles
      </span>
    </div>
    <div id="tbl-vehicles">${hasCachedData ? '' : renderSkeletonTable(6, 6)}</div>
  `;

  const renderTableData = () => {
    const chip = $('vehicles-count-chip');
    const uOwners = new Set(DB.vehicles.map((v: any) => v.ownerId || v.ownerEmail || v.ownerName)).size;
    if (chip) chip.innerHTML = `${ic('car')} ${uOwners} ${uOwners === 1 ? 'owner' : 'owners'} · ${DB.vehicles.length} vehicles`;

    registerTable('vehicles', () => {
      if (vehicleViewMode === 'user') {
        return buildUserWiseVehiclesHtml(DB.vehicles, st.search, st.filters?.fuel);
      }
      return buildTable('vehicles', vehicleColumns(), DB.vehicles, {
        onRowClick: 'view-vehicle',
        filterFn: (r: any, f: any) => !f.fuel || r.fuel === f.fuel,
        emptyTitle: 'No vehicles found',
        emptyBody: 'Adjust your filters to see more results.',
      });
    });

    refreshTable('vehicles');
  };

  if (hasCachedData) {
    renderTableData();
  }

  syncVehicles()
    .then(() => {
      renderTableData();
    })
    .catch((err) => {
      if (!hasCachedData) {
        const tbl = $('tbl-vehicles');
        if (tbl) {
          tbl.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load vehicles</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-vehicles">Retry</button></div>`;
        }
      }
    });
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerVehicleSection() {
  registerRoute('vehicles', renderVehicleView);

  registerActions({
    'view-vehicle': (el: HTMLElement) => {
      if (el.dataset.id) openVehicleDrawer(el.dataset.id);
    },
    'set-vehicle-view': (el: HTMLElement) => {
      const mode = el.dataset.mode;
      if (mode === 'user' || mode === 'table') {
        vehicleViewMode = mode;
        renderVehicleView();
      }
    },
    'toggle-vehicle-user-card': (el: HTMLElement) => {
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
        if (isClosed) openVehicleUserCards.add(key);
        else openVehicleUserCards.delete(key);
      }
    },
    'retry-vehicles': () => {
      syncVehicles().then(() => renderVehicleView()).catch(() => renderVehicleView());
    },
  });
}

// Auto-register upon import
registerVehicleSection();

export default function Vechile() {
  useEffect(() => {
    renderVehicleView();
  }, []);

  return <div id="vehicles-component-root" />;
}
