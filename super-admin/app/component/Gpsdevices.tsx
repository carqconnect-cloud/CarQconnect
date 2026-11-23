'use client';

import React, { useEffect } from 'react';
import {
  $,
  ic,
  escapeHtml,
  timeAgo,
  statusBadge,
  badge,
  renderEmpty,
  renderSkeletonTable,
  openDrawer,
  openModal,
  closeModal,
  showToast,
  afterMutation,
  tableState,
  registerTable,
  refreshTable,
  buildTable,
  apiClient,
  DB,
  registerRoute,
  registerActions,
  registerRowMenuProvider,
} from '../../lib/adminShared';
import { syncVehicles } from './Vechile';

/* =========================================================================
   ENTITY MAPPER
========================================================================= */
export function mapGpsFromApi(g: any) {
  if (!g) return null;
  return {
    id: g.id,
    imei: g.imei,
    status: (g.status || 'unassigned').toLowerCase(),
    vehicleId: g.vehicleId || null,
    vehicleReg: g.vehicleReg || null,
    battery: g.battery ?? 85,
    signal: g.signal ?? 'Strong',
    lastSeen: g.lastSeen ? new Date(g.lastSeen).getTime() : Date.now(),
    geofences: g.geofences ?? 0,
    raw: g,
  };
}

/* =========================================================================
   SERVER SYNCHRONIZER
========================================================================= */
export async function syncGpsDevices(query: any = {}) {
  if (!apiClient.getToken()) return DB.gpsDevices || [];
  const res: any = await apiClient.get('/admin/gps', { page: 1, limit: 100, ...query });
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.gpsDevices = rawItems.map(mapGpsFromApi).filter(Boolean);
  return DB.gpsDevices;
}

/* =========================================================================
   COLUMNS & TABLE
========================================================================= */
export function gpsColumns() {
  return [
    { key: 'imei', label: 'IMEI', sortable: true, render: (r: any) => `<span class="mono cell-primary">${r.imei}</span>` },
    { key: 'status', label: 'Status', sortable: true, render: (r: any) => statusBadge(r.status) },
    { key: 'vehicleReg', label: 'Vehicle', sortable: false, render: (r: any) => (r.vehicleReg ? `<span class="mono">${r.vehicleReg}</span>` : '<span class="faint">—</span>') },
    {
      key: 'battery',
      label: 'Battery',
      sortable: true,
      render: (r: any) =>
        `<div style="display:flex;align-items:center;gap:6px;"><div class="progress-track" style="width:60px;"><div class="progress-fill" style="width:${r.battery}%;background:${r.battery < 25 ? 'var(--danger)' : 'var(--accent)'}"></div></div><span class="cell-sub">${r.battery}%</span></div>`,
    },
    { key: 'signal', label: 'Signal', sortable: true },
    { key: 'lastSeen', label: 'Last seen', sortable: true, render: (r: any) => timeAgo(r.lastSeen) },
  ];
}

/* =========================================================================
   DRAWER & MODALS
========================================================================= */
export async function openGpsDrawer(id: string) {
  const head = `<div class="drawer-head"><div><h3 class="mono">GPS Device Details</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">Loading data…</div></div>
  <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
  openDrawer(head, [{ key: 'overview', label: 'Overview' }], 'overview', () => '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading GPS data…</div>');

  try {
    const [g, tripsRes, geofencesRes]: any = await Promise.all([
      apiClient.get(`/admin/gps/${id}`),
      apiClient.get(`/admin/gps/${id}/trips`).catch(() => ({ trips: [], breadcrumbs: [] })),
      apiClient.get(`/admin/gps/${id}/geofences`).catch(() => []),
    ]);
    const trips = Array.isArray(tripsRes) ? tripsRes : tripsRes?.trips || [];
    const breadcrumbs = tripsRes?.breadcrumbs || [];
    const geofences = Array.isArray(geofencesRes) ? geofencesRes : geofencesRes?.geofences || [];

    const liveHead = `<div class="drawer-head"><div><h3 class="mono">${g.imei}</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">${g.vehicleReg ? 'Bound to ' + g.vehicleReg : 'Unassigned'}</div></div>
    <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    const tabs = [
      { key: 'overview', label: 'Health & status' },
      { key: 'trips', label: 'Live Running & Breadcrumbs' },
      { key: 'geofence', label: 'Geofences' },
    ];
    function render(tab: string) {
      if (tab === 'overview') {
        return `<div class="kv-grid">
        <div class="kv"><span class="k">Status</span><span class="v">${statusBadge(g.status ? g.status.toLowerCase() : 'unassigned')}</span></div>
        <div class="kv"><span class="k">Speed</span><span class="v mono" style="font-weight:700;">${g.speed ?? 0} km/h</span></div>
        <div class="kv"><span class="k">Battery</span><span class="v">${g.batteryLevel ?? g.battery ?? 85}%</span></div>
        <div class="kv"><span class="k">Signal</span><span class="v">${g.signalStrength ?? g.signal ?? 'Strong'}</span></div>
        <div class="kv"><span class="k">Last seen</span><span class="v">${g.lastSeenAt ? timeAgo(new Date(g.lastSeenAt).getTime()) : 'Recently'}</span></div>
        </div><div class="divider"></div>
        <div class="hstack" style="flex-wrap:wrap;">
          <button class="btn btn-sm" data-action="open-assign-gps" data-id="${g.id}">${g.vehicleId ? 'Reassign' : 'Assign'}</button>
          ${g.vehicleId ? `<button class="btn btn-sm btn-danger" data-action="unbind-gps" data-id="${g.id}">Unbind</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-action="simulate-gps-ping" data-imei="${g.imei}" data-id="${g.id}">${ic('refresh')} Ping Telemetry</button>
        </div>`;
      }
      if (tab === 'trips') {
        const lat = g.lastLatitude ?? g.lastLat ?? g.lat ?? '22.7196';
        const lng = g.lastLongitude ?? g.lastLng ?? g.lng ?? '75.8577';
        const latF = parseFloat(lat) || 22.7196;
        const lngF = parseFloat(lng) || 75.8577;
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lngF - 0.01}%2C${latF - 0.01}%2C${lngF + 0.01}%2C${latF + 0.01}&layer=mapnik&marker=${latF}%2C${lngF}`;
        const gmapsUrl = `https://www.google.com/maps?q=${latF},${lngF}`;

        const breadcrumbsHtml = breadcrumbs.length
          ? `<div class="timeline" style="margin-top:10px;">${breadcrumbs.map((b: any) => `
              <div class="tl-item">
                <div class="tl-dot" style="background:var(--accent);"></div>
                <div class="tl-body">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <b class="mono" style="font-size:12px;">${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}</b>
                    <span class="badge badge-success" style="font-size:10px;">${b.speed} km/h</span>
                  </div>
                  <div class="tl-time" style="font-size:11px;margin-top:2px;">${b.recordedAt ? timeAgo(new Date(b.recordedAt).getTime()) : 'Just now'} · Batt: ${b.battery}%</div>
                </div>
              </div>`).join('')}</div>`
          : `<div class="p-4 text-center muted" style="font-size:12px;padding:16px 0;">No live telemetry pings recorded yet for this device.</div>`;

        const tripsList = trips.length
          ? `<div class="timeline" style="margin-top:10px;">${trips.map((t: any) => `<div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><b>${escapeHtml(t.title || 'Trip logged')}</b><p>${t.distanceKm || 12} km · ${t.durationMin ? t.durationMin + ' min' : ''}</p><div class="tl-time">${t.createdAt ? timeAgo(new Date(t.createdAt).getTime()) : 'Recently'}</div></div></div>`).join('')}</div>`
          : '';

        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Live Vehicle Location</div>
              <button class="btn btn-sm btn-ghost" data-action="simulate-gps-ping" data-imei="${g.imei}" data-id="${g.id}" style="padding:2px 8px;font-size:11px;">
                ${ic('refresh')} Simulate Ping
              </button>
            </div>
            <div style="font-family:monospace;font-size:12px;margin-bottom:8px;color:var(--text-sub);display:flex;align-items:center;justify-content:space-between;">
              <span>${latF.toFixed(5)}, ${lngF.toFixed(5)} &nbsp;<span class="badge badge-info">${g.speed ?? 0} km/h</span></span>
              <a href="${gmapsUrl}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none;font-size:11px;">${ic('externalLink')} Open Map</a>
            </div>
            <iframe src="${mapUrl}" style="width:100%;height:200px;border:none;border-radius:8px;display:block;" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>
          </div>

          <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-top:14px;margin-bottom:4px;">
            Running Telemetry Breadcrumbs (${breadcrumbs.length})
          </div>
          ${breadcrumbsHtml}

          ${trips.length ? `
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-top:16px;margin-bottom:4px;">
              Logged Route Trips (${trips.length})
            </div>
            ${tripsList}
          ` : ''}
        `;
      }
      if (tab === 'geofence') {
        return `<div class="list-simple">${geofences
          .map((gf: any) => `<div class="list-simple-row"><span>${escapeHtml(gf.name || 'Geofence zone')}</span>${badge('Active', 'success')}</div>`)
          .join('')}</div>${geofences.length === 0 ? renderEmpty('No geofences set', 'Add a geofence to get alerts when the vehicle enters or exits a zone.', 'mapPin') : ''}<button class="btn btn-sm" style="margin-top:10px;" data-action="add-geofence" data-id="${g.id}">${ic('plus')} Add geofence</button>`;
      }
      return '';
    }
    openDrawer(liveHead, tabs, 'overview', render);
  } catch (err: any) {
    const errHead = `<div class="drawer-head"><div><h3>Error</h3></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    openDrawer(errHead, [{ key: 'error', label: 'Error' }], 'error', () => `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load GPS details: ${escapeHtml(err.message)}</div>`);
  }
}

export async function openRegisterGpsModal() {
  if (!DB.vehicles || DB.vehicles.length === 0) {
    try {
      await syncVehicles();
    } catch (e) {}
  }
  const vehicles = DB.vehicles || [];

  openModal({
    title: 'Register GPS Device',
    submitLabel: 'Register Device',
    body: `
      <div class="form-grid single" style="display:flex;flex-direction:column;gap:14px;">
        <div class="field">
          <label style="font-weight:600;font-size:12.5px;display:block;margin-bottom:4px;">IMEI Number <span style="color:var(--danger)">*</span></label>
          <input id="f-gps-imei" class="input" placeholder="e.g. 865432061234567" style="width:100%;font-family:monospace;" required>
          <div class="cell-sub" style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">Unique 15-digit hardware identifier</div>
        </div>
        <div class="field">
          <label style="font-weight:600;font-size:12.5px;display:block;margin-bottom:4px;">Device Model</label>
          <input id="f-gps-model" class="input" placeholder="e.g. CarQ OBD-II Pro Tracker" value="CarQ OBD-II Pro Tracker" style="width:100%;">
        </div>
        <div class="field">
          <label style="font-weight:600;font-size:12.5px;display:block;margin-bottom:4px;">Vendor / Manufacturer</label>
          <input id="f-gps-vendor" class="input" placeholder="e.g. CarQ Telematics" value="CarQ Telematics" style="width:100%;">
        </div>
        <div class="field">
          <label style="font-weight:600;font-size:12.5px;display:block;margin-bottom:4px;">Serial Number (Optional)</label>
          <input id="f-gps-serial" class="input" placeholder="e.g. SN-CQ-2026-004" style="width:100%;font-family:monospace;">
        </div>
        <div class="field">
          <label style="font-weight:600;font-size:12.5px;display:block;margin-bottom:4px;">Bind to Vehicle (Optional)</label>
          <select id="f-gps-veh" class="select" style="width:100%;">
            <option value="">— Leave Unassigned (In Inventory) —</option>
            ${vehicles.map((v: any) => `<option value="${v.id}">${v.reg} — ${escapeHtml(v.model)} (${escapeHtml(v.ownerName)})</option>`).join('')}
          </select>
        </div>
      </div>
    `,
    onSubmit: async () => {
      const imeiInput = ($('f-gps-imei') as HTMLInputElement)?.value?.trim();
      const modelInput = ($('f-gps-model') as HTMLInputElement)?.value?.trim();
      const vendorInput = ($('f-gps-vendor') as HTMLInputElement)?.value?.trim();
      const serialInput = ($('f-gps-serial') as HTMLInputElement)?.value?.trim();
      const vehicleId = ($('f-gps-veh') as HTMLSelectElement)?.value?.trim();

      if (!imeiInput) {
        showToast('IMEI is required.', 'danger');
        return;
      }

      try {
        const newDevice: any = await apiClient.post('/admin/gps', {
          imei: imeiInput,
          model: modelInput || undefined,
          vendor: vendorInput || undefined,
          serialNumber: serialInput || undefined,
        });

        const devId = newDevice?.id || newDevice?.data?.id;
        if (vehicleId && devId) {
          await apiClient.post(`/admin/gps/${devId}/assign`, { vehicleId });
        }

        await Promise.all([syncGpsDevices(), syncVehicles()]);
        closeModal();
        afterMutation('GPS Device registered successfully.');
      } catch (err: any) {
        showToast(err.message || 'Failed to register GPS device', 'danger');
      }
    },
  });
}

export async function openAssignGpsModal(id: string) {
  const g = DB.gpsDevices.find((x: any) => x.id === id);
  if (!DB.vehicles || DB.vehicles.length === 0) {
    try {
      await syncVehicles();
    } catch (e) {}
  }
  const options = (DB.vehicles || []).filter((v: any) => !v.gpsLinked || (g && v.id === g.vehicleId));
  openModal({
    title: (g?.vehicleId ? 'Reassign' : 'Assign') + ' GPS device',
    submitLabel: 'Save',
    body: `<div class="form-grid single">
      <div class="field"><label>Device IMEI</label><input value="${g ? g.imei : id}" disabled></div>
      <div class="field"><label>Select vehicle</label><select id="f-veh">
        <option value="">— Choose a vehicle —</option>
        ${options.map((v: any) => `<option value="${v.id}" ${g && v.id === g.vehicleId ? 'selected' : ''}>${v.reg} — ${escapeHtml(v.ownerName)}</option>`).join('')}
      </select></div>
    </div>`,
    onSubmit: async () => {
      const vid = $('f-veh').value;
      if (!vid) {
        showToast('Choose a vehicle first.', 'danger');
        return;
      }
      try {
        await apiClient.post(`/admin/gps/${id}/assign`, { vehicleId: vid });
        await Promise.all([syncGpsDevices(), syncVehicles()]);
        closeModal();
        afterMutation('GPS device bound successfully.');
      } catch (err: any) {
        showToast(err.message || 'Failed to bind GPS device', 'danger');
      }
    },
  });
}

export async function unbindGps(id: string) {
  const g = DB.gpsDevices.find((x: any) => x.id === id);
  try {
    await apiClient.post(`/admin/gps/${encodeURIComponent(id)}/unbind`, { notes: 'Unbound by Super Admin' });
    if (g) {
      const v = (DB.vehicles || []).find((x: any) => x.id === g.vehicleId);
      if (v) v.gpsLinked = false;
      g.vehicleId = null;
      g.vehicleReg = null;
      g.status = 'unassigned';
    }
    afterMutation('GPS device unbound.', 'danger');
    syncGpsDevices();
    syncVehicles();
  } catch (err: any) {
    showToast('Failed to unbind GPS: ' + (err.message || 'Server error'), 'danger');
  }
}

/* =========================================================================
   ROUTE VIEW RENDERER
========================================================================= */
export function renderGpsdevicesView() {
  const st = tableState('gps');
  const viewEl = $('view');
  if (!viewEl) return;

  const hasCachedData = Array.isArray(DB.gpsDevices) && DB.gpsDevices.length > 0;

  viewEl.innerHTML = `
    <div class="page-head">
      <div>
        <h1>GPS devices</h1>
        <p>Device inventory, live health signals, vehicle binding and geofence configuration.</p>
      </div>
      <div class="page-head-actions">
        <button class="btn btn-primary" data-action="open-register-gps">
          ${ic('plus')} Register Device
        </button>
      </div>
    </div>
    <div class="toolbar" style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
      <div class="toolbar-search">
        ${ic('search')}<input placeholder="Search IMEI, vehicle…" data-table-search="gps" value="${escapeHtml(st.search)}">
      </div>
      <select data-table-filter="gps" data-filter-key="status">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="unassigned">Unassigned</option>
        <option value="maintenance">Maintenance</option>
      </select>
      <div class="spacer"></div>
      <span class="chip" id="gps-count-chip">${ic('satellite')} ${DB.gpsDevices.length} devices</span>
    </div>
    <div id="tbl-gps">${hasCachedData ? '' : renderSkeletonTable(6, 6)}</div>
  `;

  const renderTableData = () => {
    const chip = $('gps-count-chip');
    if (chip) chip.innerHTML = `${ic('satellite')} ${DB.gpsDevices.length} devices`;
    registerTable('gps', () =>
      buildTable('gps', gpsColumns(), DB.gpsDevices, {
        onRowClick: 'view-gps',
        filterFn: (r: any, f: any) => !f.status || r.status === f.status,
        rowActions: (r: any) => `<div class="kebab-wrap"><button class="btn-icon" data-action="row-menu" data-menu="gps" data-id="${r.id}">${ic('kebab')}</button></div>`,
        emptyTitle: 'No devices match',
        emptyBody: 'Try a different status filter or search term.',
      }),
    );
    refreshTable('gps');
  };

  if (hasCachedData) {
    renderTableData();
  }

  syncGpsDevices()
    .then(() => {
      renderTableData();
    })
    .catch((err) => {
      if (!hasCachedData) {
        const tbl = $('tbl-gps');
        if (tbl) {
          tbl.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load GPS devices</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-gps">Retry</button></div>`;
        }
      }
    });
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerGpsdevicesSection() {
  registerRoute('gps', renderGpsdevicesView);

  registerActions({
    'open-register-gps': () => {
      openRegisterGpsModal();
    },
    'open-assign-gps': (el: HTMLElement) => {
      if (el.dataset.id) openAssignGpsModal(el.dataset.id);
    },
    'unbind-gps': (el: HTMLElement) => {
      if (el.dataset.id) unbindGps(el.dataset.id);
    },
    'view-gps': (el: HTMLElement) => {
      if (el.dataset.id) openGpsDrawer(el.dataset.id);
    },
    'retry-gps': () => {
      syncGpsDevices().then(() => renderGpsdevicesView()).catch(() => renderGpsdevicesView());
    },
    'simulate-gps-ping': async (el: HTMLElement) => {
      const imei = el.dataset.imei;
      const id = el.dataset.id;
      if (!imei) return;
      try {
        const baseLat = 22.7196 + (Math.random() - 0.5) * 0.02;
        const baseLng = 75.8577 + (Math.random() - 0.5) * 0.02;
        const speed = Math.floor(25 + Math.random() * 45);
        await apiClient.post('/admin/gps/telemetry', {
          imei,
          latitude: Number(baseLat.toFixed(5)),
          longitude: Number(baseLng.toFixed(5)),
          speed,
          heading: Math.floor(Math.random() * 360),
          batteryLevel: Math.floor(75 + Math.random() * 20),
        });
        showToast(`Telemetry ping broadcast: ${speed} km/h`, 'success');
        if (id) openGpsDrawer(id);
        syncGpsDevices();
      } catch (err: any) {
        showToast(err.message || 'Failed to broadcast ping', 'danger');
      }
    },
  });

  registerRowMenuProvider('gps', (id: string) => {
    const g = DB.gpsDevices.find((x: any) => x.id === id);
    const items: any[] = [
      { label: 'View', icon: 'chevRight', action: () => openGpsDrawer(id) },
      { label: g?.vehicleId ? 'Reassign' : 'Assign', icon: 'tag', action: () => openAssignGpsModal(id) },
    ];
    if (g?.vehicleId) {
      items.push({ label: 'Unbind', icon: 'x', danger: true, action: () => unbindGps(id) });
    }
    return items;
  });
}

// Auto-register upon import
registerGpsdevicesSection();

export default function Gpsdevices() {
  useEffect(() => {
    renderGpsdevicesView();
  }, []);

  return <div id="gps-component-root" />;
}
