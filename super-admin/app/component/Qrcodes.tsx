'use client';

import React, { useEffect } from 'react';
import {
  $,
  $$,
  ic,
  escapeHtml,
  fmtDate,
  timeAgo,
  randInt,
  statusBadge,
  initials,
  renderEmpty,
  renderSkeletonTable,
  openDrawer,
  openModal,
  closeModal,
  showToast,
  confirmAction,
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
   ENTITY MAPPER & MULTI-VEHICLE HELPERS
========================================================================= */
export function mapQrFromApi(q: any) {
  if (!q) return null;
  return {
    id: q.id,
    code: q.code,
    batch: q.batch || 'BATCH-PRIMARY',
    status: (q.status || 'available').toLowerCase(),
    rawStatus: q.status,
    vehicleId: q.vehicleId || null,
    vehicleReg: q.vehicleReg || (q.vehicle?.reg ?? null),
    vehicleModel: q.vehicleModel || (q.vehicle?.model ?? q.vehicle?.name ?? null),
    ownerId: q.ownerId || (q.owner?.id ?? null),
    ownerName: q.ownerName || (q.owner?.fullName ?? null),
    ownerEmail: q.ownerEmail || (q.owner?.email ?? null),
    ownerPhone: q.ownerPhone || (q.owner?.phone ?? null),
    scans: q.scans ?? q.scansCount ?? 0,
    createdAt: new Date(q.createdAt || Date.now()).getTime(),
    updatedAt: q.updatedAt ? new Date(q.updatedAt).getTime() : undefined,
    raw: q,
  };
}

export function getOwnerQrCount(ownerNameOrId: string): number {
  if (!ownerNameOrId) return 0;
  const key = ownerNameOrId.trim().toLowerCase();
  return (DB.qrCodes || []).filter((q: any) => {
    const qKey = (q.ownerId || q.ownerName || '').trim().toLowerCase();
    return qKey === key;
  }).length;
}

export function getQrsByOwner(qrCodes: any[]) {
  const groups: Record<
    string,
    {
      ownerKey: string;
      ownerName: string;
      ownerEmail?: string;
      ownerPhone?: string;
      ownerId?: string;
      qrs: any[];
      totalScans: number;
      activeCount: number;
    }
  > = {};

  qrCodes.forEach((q: any) => {
    const key = q.ownerId || (q.ownerName ? q.ownerName.trim().toLowerCase() : 'unassigned');
    const displayName = q.ownerName || (q.vehicleReg ? 'Assigned Vehicle Owner' : 'Unassigned Inventory');
    if (!groups[key]) {
      groups[key] = {
        ownerKey: key,
        ownerName: displayName,
        ownerEmail: q.ownerEmail,
        ownerPhone: q.ownerPhone,
        ownerId: q.ownerId,
        qrs: [],
        totalScans: 0,
        activeCount: 0,
      };
    }
    groups[key].qrs.push(q);
    groups[key].totalScans += q.scans || 0;
    if (q.status === 'active' || q.status === 'assigned') {
      groups[key].activeCount++;
    }
  });

  return Object.values(groups).sort((a, b) => b.qrs.length - a.qrs.length);
}

/* =========================================================================
   SERVER SYNCHRONIZER
========================================================================= */
function enrichQrWithVehicles(vehicles: any[]) {
  if (!Array.isArray(DB.qrCodes) || !Array.isArray(vehicles)) return;
  DB.qrCodes.forEach((q: any) => {
    if ((!q.vehicleModel || !q.ownerName) && q.vehicleReg) {
      const match = vehicles.find((v: any) => v.reg === q.vehicleReg || v.id === q.vehicleId);
      if (match) {
        if (!q.vehicleModel) q.vehicleModel = match.model || match.name;
        if (!q.ownerName) q.ownerName = match.ownerName;
        if (!q.ownerPhone) q.ownerPhone = match.ownerPhone;
        if (!q.ownerEmail) q.ownerEmail = match.ownerEmail;
      }
    }
  });
}

export async function syncQrCodes(query: any = {}) {
  if (!apiClient.getToken()) return DB.qrCodes || [];
  try {
    const res: any = await apiClient.get('/admin/qr', { page: 1, limit: 100, ...query });
    const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
    DB.qrCodes = rawItems.map(mapQrFromApi).filter(Boolean);

    if (Array.isArray(DB.vehicles) && DB.vehicles.length > 0) {
      enrichQrWithVehicles(DB.vehicles);
    } else {
      syncVehicles()
        .then((vehicles) => {
          if (Array.isArray(vehicles) && vehicles.length > 0) {
            enrichQrWithVehicles(vehicles);
            refreshTable('qr');
            updateQrAuxiliaryViews();
          }
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to sync QR codes:', err);
  }
  return DB.qrCodes;
}

/* =========================================================================
   COLUMNS & TABLE (USER GROUPED DEFAULT + FLAT FALLBACK)
========================================================================= */
export function ownerColumns() {
  return [
    {
      key: 'ownerName',
      label: 'Owner / User',
      sortable: true,
      searchValue: (r: any) => `${r.ownerName} ${r.ownerPhone || ''} ${r.ownerEmail || ''}`,
      render: (r: any) => {
        const isUnassigned = r.ownerKey === 'unassigned';
        return `
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="avatar" style="width:38px;height:38px;border-radius:10px;background:${
              isUnassigned ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #0284c7, #2563eb)'
            };color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13.5px;flex-shrink:0;">
              ${isUnassigned ? 'UN' : initials(r.ownerName)}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-weight:700;font-size:13.5px;color:var(--text-bright);">${escapeHtml(r.ownerName)}</span>
                <span class="badge ${r.qrs.length > 1 ? 'badge-info' : 'badge-neutral'}" style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:10px;">
                  ${r.qrs.length} ${r.qrs.length === 1 ? 'Vehicle' : 'Vehicles'}
                </span>
              </div>
              <div class="cell-sub" style="font-size:11.5px;opacity:0.75;margin-top:2px;">
                ${escapeHtml(r.ownerPhone ? `📞 ${r.ownerPhone}` : (r.ownerEmail || (isUnassigned ? 'Inventory Pool' : 'Verified Owner')))}
              </div>
            </div>
          </div>
        `;
      },
    },
    {
      key: 'vehicles',
      label: 'Attached Vehicles & QR Codes',
      sortable: false,
      searchValue: (r: any) =>
        r.qrs.map((q: any) => `${q.vehicleReg || ''} ${q.vehicleModel || ''} ${q.code}`).join(' '),
      render: (r: any) => `
        <div style="display:flex;flex-direction:column;gap:6px;padding:4px 0;">
          ${r.qrs
            .map(
              (q: any) => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);padding:6px 12px;border-radius:6px;gap:12px;">
              <!-- Vehicle Plate & Model -->
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:14px;">🚗</span>
                <div>
                  <span class="mono" style="font-weight:700;font-size:12.5px;letter-spacing:0.4px;color:var(--text-bright);">
                    ${escapeHtml(q.vehicleReg || 'No Vehicle Linked')}
                  </span>
                  ${q.vehicleModel ? `<span class="muted" style="font-size:11.5px;margin-left:6px;">${escapeHtml(q.vehicleModel)}</span>` : ''}
                </div>
              </div>

              <!-- QR Code, Status & Scans -->
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="mono" style="font-weight:700;font-size:12px;color:var(--primary);background:rgba(59,130,246,0.1);padding:2px 6px;border-radius:4px;">
                  ${escapeHtml(q.code)}
                </span>
                ${statusBadge(q.status)}
                <span style="font-size:11.5px;font-weight:600;color:${q.scans > 0 ? '#10b981' : 'var(--text-muted)'};min-width:60px;text-align:right;">
                  ${q.scans} ${q.scans === 1 ? 'scan' : 'scans'}
                </span>
                <button class="btn btn-sm btn-ghost" data-action="print-single-qr" data-code="${q.code}" data-veh="${escapeHtml(q.vehicleReg || '')}" data-owner="${escapeHtml(r.ownerName)}" title="Print Sticker" style="padding:2px 6px;font-size:11px;" onclick="event.stopPropagation();">
                  ${ic('download')}
                </button>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      `,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r: any) =>
        r.activeCount === r.qrs.length
          ? statusBadge('active')
          : r.activeCount > 0
          ? `<span class="badge badge-info"><span class="dot"></span>${r.activeCount}/${r.qrs.length} Active</span>`
          : statusBadge(r.qrs[0]?.status || 'available'),
    },
    {
      key: 'totalScans',
      label: 'Total Scans',
      sortable: true,
      align: 'right',
      render: (r: any) => `
        <div style="text-align:right;">
          <div style="font-weight:700;font-size:14px;color:${r.totalScans > 0 ? '#10b981' : 'inherit'};">
            ${r.totalScans} <span style="font-size:11px;font-weight:normal;opacity:0.75;">${r.totalScans === 1 ? 'scan' : 'scans'}</span>
          </div>
          <div style="font-size:10.5px;color:${r.totalScans > 0 ? '#10b981' : 'var(--text-faint)'};font-weight:600;">
            ${r.totalScans > 0 ? '● Active Safety' : 'No scans yet'}
          </div>
        </div>
      `,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (r: any) => `
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;" onclick="event.stopPropagation();">
          <button class="btn btn-sm btn-ghost" data-action="view-owner-fleet" data-id="${r.id}" title="View User Fleet" style="cursor:pointer;padding:4px 8px;font-size:12px;">
            ${ic('eye')} View
          </button>
          <button class="btn btn-sm btn-ghost" data-action="print-owner-qrs" data-id="${r.id}" title="Print All QR Stickers" style="cursor:pointer;padding:4px 8px;font-size:12px;">
            ${ic('download')} Print All
          </button>
        </div>
      `,
    },
  ];
}

export function qrColumns() {
  return [
    {
      key: 'code',
      label: 'QR Code',
      sortable: true,
      searchValue: (r: any) => `${r.code} ${r.batch}`,
      render: (r: any) => `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:8px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${ic('qrcode')}
          </div>
          <div>
            <div class="mono" style="font-weight:700;font-size:13.5px;color:var(--text-bright);letter-spacing:0.5px;">${escapeHtml(r.code)}</div>
            <div class="cell-sub" style="font-size:11px;opacity:0.75;">${escapeHtml(r.batch || 'BATCH-PRIMARY')}</div>
          </div>
        </div>
      `,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (r: any) => statusBadge(r.status),
    },
    {
      key: 'vehicleReg',
      label: 'Assigned Vehicle',
      sortable: true,
      searchValue: (r: any) => `${r.vehicleReg || ''} ${r.vehicleModel || ''}`,
      render: (r: any) => {
        if (!r.vehicleReg) return `<span class="muted" style="font-size:12px;font-style:italic;">— Unassigned —</span>`;
        return `
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="mono" style="font-weight:700;font-size:12.5px;letter-spacing:0.4px;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:5px;border:1px solid rgba(255,255,255,0.12);color:var(--text-bright);">
                ${escapeHtml(r.vehicleReg)}
              </span>
            </div>
            ${r.vehicleModel ? `<div class="cell-sub" style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">${escapeHtml(r.vehicleModel)}</div>` : ''}
          </div>
        `;
      },
    },
    {
      key: 'ownerName',
      label: 'Owner / User',
      sortable: true,
      searchValue: (r: any) => `${r.ownerName || ''} ${r.ownerPhone || ''} ${r.ownerEmail || ''}`,
      render: (r: any) => {
        if (!r.ownerName) return `<span class="muted" style="font-size:12px;">Inventory Pool</span>`;
        const count = getOwnerQrCount(r.ownerId || r.ownerName);
        return `
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:600;font-size:13px;color:var(--text-bright);">${escapeHtml(r.ownerName)}</span>
              ${count > 1 ? `<span class="badge" style="background:rgba(59,130,246,0.15);color:#3b82f6;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;" title="${escapeHtml(r.ownerName)} has ${count} vehicles with QR">${count} Vehicles</span>` : ''}
            </div>
            <div class="cell-sub" style="font-size:11px;opacity:0.75;">${escapeHtml(r.ownerPhone || r.ownerEmail || 'Registered User')}</div>
          </div>
        `;
      },
    },
    {
      key: 'scans',
      label: 'Scan Activity',
      sortable: true,
      align: 'right',
      render: (r: any) => `
        <div style="text-align:right;">
          <div style="font-weight:700;font-size:13.5px;color:${r.scans > 0 ? '#10b981' : 'inherit'};">
            ${r.scans} <span style="font-size:11px;font-weight:normal;opacity:0.75;">${r.scans === 1 ? 'scan' : 'scans'}</span>
          </div>
          <div style="font-size:10.5px;color:${r.scans > 0 ? '#10b981' : 'var(--text-faint)'};font-weight:600;">
            ${r.scans > 0 ? '● Active Safety' : 'No scans yet'}
          </div>
        </div>
      `,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (r: any) => `
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;" onclick="event.stopPropagation();">
          <button class="btn btn-sm btn-ghost" data-action="view-qr" data-id="${r.id}" title="View Details" style="cursor:pointer;padding:4px 8px;font-size:12px;">
            ${ic('eye')} View
          </button>
          <button class="btn-icon" data-action="row-menu" data-menu="qr" data-id="${r.id}" title="More Actions" style="cursor:pointer;">
            ${ic('kebab')}
          </button>
        </div>
      `,
    },
  ];
}

/* =========================================================================
   MUTATIONS, MODALS & PRINTING
========================================================================= */
export function printSingleQr(code: string, vehicleReg?: string, ownerName?: string) {
  const QR_API = 'https://api.qrserver.com/v1/create-qr-code';
  const url = encodeURIComponent(`https://fioner.in/scan/${code}`);
  const printHtml = `<!DOCTYPE html><html><head><title>Print QR Tag — ${escapeHtml(code)}</title>
  <style>
    @media print{@page{size:3in 4in;margin:5mm;}body{margin:0;}}
    body{font-family:Arial,sans-serif;background:#fff;color:#000;padding:12px;text-align:center;}
    .card{border:2px solid #000;border-radius:12px;padding:16px;}
    .brand{font-size:14px;font-weight:bold;letter-spacing:1px;color:#000;margin-bottom:8px;}
    .qr{margin:10px auto;display:block;}
    .code{font-family:monospace;font-size:16px;font-weight:bold;letter-spacing:1px;margin:8px 0;}
    .veh{font-family:monospace;font-size:13px;font-weight:bold;background:#eee;padding:4px 8px;border-radius:4px;display:inline-block;margin-bottom:6px;}
    .foot{font-size:10px;color:#555;margin-top:8px;}
  </style></head><body>
  <div class="card">
    <div class="brand">FIONER SMART MOBILITY · QR RAKSHAK</div>
    <img class="qr" src="${QR_API}/?size=150x150&data=${url}&color=000000&bgcolor=ffffff" width="150" height="150" alt="${escapeHtml(code)}" />
    <div class="code">${escapeHtml(code)}</div>
    ${vehicleReg ? `<div class="veh">VEHICLE: ${escapeHtml(vehicleReg)}</div><br>` : ''}
    ${ownerName ? `<div style="font-size:11px;color:#333;">Owner: <b>${escapeHtml(ownerName)}</b></div>` : ''}
    <div class="foot">Scan with any smartphone camera in case of emergency or parking assistance.</div>
  </div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=500,height=600');
  if (!win) {
    showToast('Pop-up blocked. Please allow pop-ups for this site.', 'danger');
    return;
  }
  win.document.write(printHtml);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 600);
}

export function printOwnerQrs(ownerKey: string) {
  const allGroups = getQrsByOwner(DB.qrCodes || []);
  const g = allGroups.find((x: any) => x.ownerKey === ownerKey);
  if (!g || !g.qrs.length) {
    showToast('No QR codes to print for this user.', 'danger');
    return;
  }

  const QR_API = 'https://api.qrserver.com/v1/create-qr-code';
  const cards = g.qrs
    .map((q: any) => {
      const url = encodeURIComponent(`https://fioner.in/scan/${q.code}`);
      return `
      <div style="display:inline-block;border:2px solid #000;border-radius:10px;padding:12px;margin:8px;text-align:center;width:150px;vertical-align:top;page-break-inside:avoid;">
        <div style="font-weight:bold;font-size:11px;letter-spacing:0.5px;margin-bottom:6px;">FIONER QR RAKSHAK</div>
        <img src="${QR_API}/?size=120x120&data=${url}&color=000000&bgcolor=ffffff" width="120" height="120" alt="${escapeHtml(
        q.code,
      )}" style="display:block;margin:0 auto 6px;" />
        <div style="font-family:monospace;font-size:12px;font-weight:bold;color:#000;">${escapeHtml(q.code)}</div>
        <div style="font-family:monospace;font-size:11px;background:#eee;padding:2px 4px;border-radius:4px;margin-top:4px;font-weight:bold;">${escapeHtml(
          q.vehicleReg || 'VEHICLE',
        )}</div>
        ${q.vehicleModel ? `<div style="font-size:9px;color:#555;margin-top:2px;">${escapeHtml(q.vehicleModel)}</div>` : ''}
        <div style="font-size:8px;color:#777;margin-top:4px;">Owner: ${escapeHtml(g.ownerName)}</div>
      </div>`;
    })
    .join('');

  const printHtml = `<!DOCTYPE html><html><head><title>Print QR Tags — ${escapeHtml(
    g.ownerName,
  )}</title><style>@media print{@page{margin:10mm}body{margin:0}}body{font-family:system-ui,sans-serif;background:#fff;padding:16px}.sheet-title{font-size:14px;font-weight:700;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:6px;}</style></head><body><div class="sheet-title">🔲 Fioner QR Safety Tags — ${escapeHtml(
    g.ownerName,
  )} (${g.qrs.length} Vehicles)</div><div>${cards}</div></body></html>`;

  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) {
    showToast('Pop-up blocked. Please allow pop-ups for this site.', 'danger');
    return;
  }
  win.document.write(printHtml);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 600);
}

export function openPrintQrModal() {
  const codes = (DB.qrCodes || []).slice(0, 48); // max 48 per sheet
  if (!codes.length) {
    showToast('No QR codes available to print.', 'danger');
    return;
  }

  const QR_API = 'https://api.qrserver.com/v1/create-qr-code';
  const cards = codes
    .map((q: any) => {
      const url = encodeURIComponent(`https://fioner.in/scan/${q.code}`);
      return `
      <div style="display:inline-block;border:1px solid #ddd;border-radius:8px;padding:10px;margin:6px;text-align:center;width:130px;vertical-align:top;page-break-inside:avoid;">
        <img src="${QR_API}/?size=110x110&data=${url}&color=1a1a2e&bgcolor=ffffff" width="110" height="110" alt="${escapeHtml(
        q.code,
      )}" style="display:block;margin:0 auto 6px;" />
        <div style="font-family:monospace;font-size:9px;word-break:break-all;color:#222;">${escapeHtml(q.code)}</div>
        ${q.vehicleReg ? `<div style="font-size:9px;color:#666;margin-top:2px;">${escapeHtml(q.vehicleReg)}</div>` : ''}
        <div style="font-size:8px;color:#999;margin-top:2px;">${escapeHtml(q.status)}</div>
      </div>`;
    })
    .join('');

  const printHtml = `<!DOCTYPE html><html><head><title>QR Batch Print — Fioner Control</title><style>@media print{@page{margin:12mm}body{margin:0}}body{font-family:system-ui,sans-serif;background:#fff;padding:16px}.sheet-title{font-size:14px;font-weight:700;margin-bottom:12px;color:#111;border-bottom:2px solid #333;padding-bottom:6px;}.codes{text-align:left;}</style></head><body><div class="sheet-title">🔲 Fioner QR Batch Sheet — ${
    codes.length
  } codes — ${new Date().toLocaleDateString('en-IN')}</div><div class="codes">${cards}</div></body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    showToast('Pop-up blocked. Please allow pop-ups for this site.', 'danger');
    return;
  }
  win.document.write(printHtml);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 800);
}

export function openBatchQrModal() {
  openModal({
    title: 'Batch generate QR codes',
    submitLabel: 'Generate batch',
    body: `<div class="form-grid single">
      <div class="field"><label>Batch name</label><input id="f-batch" placeholder="BATCH-2026011"></div>
      <div class="field"><label>Quantity</label><input id="f-qty" type="number" min="1" max="500" value="50"></div>
      <p class="muted" style="font-size:12px;">Generated codes start in <b>Available</b> status and can be assigned to vehicles from the QR inventory.</p>
    </div>`,
    onSubmit: async () => {
      const batch = $('f-batch').value.trim() || 'BATCH-' + randInt(100000, 999999);
      const qty = Math.min(500, Math.max(1, parseInt($('f-qty').value) || 50));
      try {
        await apiClient.post('/admin/qr/batch', { quantity: qty, count: qty, batchName: batch });
        await syncQrCodes();
        closeModal();
        afterMutation(`${qty} QR codes generated in batch ${batch}.`);
      } catch (err: any) {
        showToast(err.message || 'Failed to generate QR batch', 'danger');
      }
    },
  });
}

export async function openAssignQrModal(id: string) {
  const q = DB.qrCodes.find((x: any) => x.id === id);
  if (!DB.vehicles || DB.vehicles.length === 0) {
    try {
      await syncVehicles();
    } catch (e) {}
  }
  const unlinkedVehicles = (DB.vehicles || []).filter((v: any) => !v.qrLinked || (q && v.id === q.vehicleId));
  openModal({
    title: 'Assign QR to vehicle',
    submitLabel: 'Assign',
    body: `<div class="form-grid single">
      <div class="field"><label>QR code</label><input value="${q ? q.code : id}" disabled></div>
      <div class="field"><label>Select vehicle</label><select id="f-vehicle">
        <option value="">— Choose a vehicle —</option>
        ${unlinkedVehicles
          .map(
            (v: any) =>
              `<option value="${v.id}" ${q && v.id === q.vehicleId ? 'selected' : ''}>${v.reg} — ${escapeHtml(
                v.ownerName,
              )} (${escapeHtml(v.model || 'Vehicle')})</option>`,
          )
          .join('')}
      </select></div>
    </div>`,
    onSubmit: async () => {
      const vid = $('f-vehicle').value;
      if (!vid) {
        showToast('Choose a vehicle to assign.', 'danger');
        return;
      }
      try {
        await apiClient.post(`/admin/qr/${id}/assign`, { vehicleId: vid });
        await Promise.all([syncQrCodes(), syncVehicles()]);
        closeModal();
        afterMutation('QR assigned successfully.');
      } catch (err: any) {
        showToast(err.message || 'Failed to assign QR code', 'danger');
      }
    },
  });
}

export function openReplaceQrModal(id: string) {
  const q = DB.qrCodes.find((x: any) => x.id === id);
  confirmAction(
    'Replace QR code',
    `A new QR code will be generated for ${
      q?.vehicleReg ? '<b class="mono">' + q.vehicleReg + '</b>' : 'this vehicle'
    } and code (${q?.code || id}) will be marked as replaced. Continue?`,
    'Replace QR',
    async () => {
      try {
        await apiClient.post(`/admin/qr/${id}/replace`, { reason: 'Damaged or lost QR' });
        await syncQrCodes();
        closeModal();
        afterMutation('QR replaced successfully.');
      } catch (err: any) {
        showToast(err.message || 'Failed to replace QR code', 'danger');
      }
    },
    true,
  );
}

export async function suspendQr(id: string) {
  const q = DB.qrCodes.find((x: any) => x.id === id);
  try {
    await apiClient.post(`/admin/qr/${encodeURIComponent(id)}/suspend`, { reason: 'Suspended by Super Admin' });
    if (q) q.status = 'suspended';
    afterMutation('QR ' + (q?.code || id) + ' suspended.', 'danger');
    syncQrCodes();
  } catch (err: any) {
    showToast('Failed to suspend QR: ' + (err.message || 'Server error'), 'danger');
  }
}

export async function reactivateQr(id: string) {
  const q = DB.qrCodes.find((x: any) => x.id === id);
  try {
    await apiClient.post(`/admin/qr/${encodeURIComponent(id)}/reactivate`, { notes: 'Reactivated by Super Admin' });
    if (q) q.status = q.vehicleId ? 'active' : 'available';
    afterMutation('QR ' + (q?.code || id) + ' reactivated.', 'success');
    syncQrCodes();
  } catch (err: any) {
    showToast('Failed to reactivate QR: ' + (err.message || 'Server error'), 'danger');
  }
}

/* =========================================================================
   DRAWER
========================================================================= */
export function openOwnerFleetDrawer(ownerKey: string) {
  const allGroups = getQrsByOwner(DB.qrCodes || []);
  const g = allGroups.find((x: any) => x.ownerKey === ownerKey) || allGroups[0];
  if (!g) {
    showToast('User fleet not found.', 'danger');
    return;
  }

  const liveHead = `
    <div class="drawer-head">
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 class="mono" style="margin:0;font-size:16px;">${escapeHtml(g.ownerName)}</h3>
          <span class="badge badge-info" style="font-weight:700;">${g.qrs.length} Vehicles Protected</span>
        </div>
        <div class="muted" style="font-size:12px;margin-top:4px;">
          ${escapeHtml(g.ownerPhone ? `Phone: ${g.ownerPhone}` : (g.ownerEmail || 'Registered Vehicle Owner'))} · <b>${g.totalScans} Total Scans</b>
        </div>
      </div>
      <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div>
    </div>
  `;

  const tabs = [
    { key: 'fleet', label: 'All Vehicles & QRs' },
    { key: 'scans', label: 'Scan & Activity Logs' },
    { key: 'history', label: 'History' },
  ];

  function render(tab: string) {
    if (tab === 'fleet') {
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:12px;">
            Registered Vehicles (${g.qrs.length})
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${g.qrs
              .map(
                (q: any) => `
              <div class="card" style="padding:14px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(59,130,246,0.1);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:16px;">
                      🚗
                    </div>
                    <div>
                      <div class="mono" style="font-weight:700;font-size:14px;letter-spacing:0.5px;color:var(--text-bright);">
                        ${escapeHtml(q.vehicleReg || 'Unlinked Vehicle')}
                      </div>
                      ${q.vehicleModel ? `<div class="muted" style="font-size:12px;">${escapeHtml(q.vehicleModel)}</div>` : ''}
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    ${statusBadge(q.status)}
                    <span class="badge ${q.scans > 0 ? 'badge-success' : 'badge-neutral'}">${q.scans} scans</span>
                  </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.22);padding:10px 12px;border-radius:8px;margin-bottom:12px;">
                  <div>
                    <div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.3px;">QR Safety Tag</div>
                    <div class="mono" style="font-weight:700;font-size:13px;color:var(--primary);">${escapeHtml(q.code)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div class="muted" style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.3px;">Batch</div>
                    <div style="font-size:12px;">${escapeHtml(q.batch || 'BATCH-PRIMARY')}</div>
                  </div>
                </div>

                <div class="hstack" style="flex-wrap:wrap;gap:6px;justify-content:flex-end;">
                  <button class="btn btn-sm btn-ghost" data-action="print-single-qr" data-code="${q.code}" data-veh="${escapeHtml(
                  q.vehicleReg || '',
                )}" data-owner="${escapeHtml(g.ownerName)}">
                    ${ic('download')} Print Sticker
                  </button>
                  <button class="btn btn-sm btn-ghost" data-action="open-assign-qr" data-id="${q.id}">
                    ${ic('tag')} Reassign
                  </button>
                  <button class="btn btn-sm btn-ghost" data-action="open-replace-qr" data-id="${q.id}">
                    ${ic('refresh')} Replace
                  </button>
                  ${
                    q.status !== 'SUSPENDED' && q.status !== 'suspended'
                      ? `<button class="btn btn-sm btn-danger" data-action="suspend-qr" data-id="${q.id}">Deactivate</button>`
                      : `<button class="btn btn-sm btn-primary" data-action="reactivate-qr" data-id="${q.id}">Reactivate</button>`
                  }
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'scans') {
      const allScans: any[] = [];
      g.qrs.forEach((q: any) => {
        if (q.scans > 0) {
          allScans.push({
            code: q.code,
            vehicleReg: q.vehicleReg,
            vehicleModel: q.vehicleModel,
            scans: q.scans,
            time: q.createdAt,
          });
        }
      });

      if (!allScans.length) {
        return renderEmpty('No scans yet', 'None of this user’s vehicle QR tags have been scanned yet.', 'qrcode');
      }

      return `
        <div class="timeline">
          ${allScans
            .map(
              (s: any) => `
            <div class="tl-item">
              <div class="tl-dot" style="background:var(--success);"></div>
              <div class="tl-body">
                <b>${escapeHtml(s.vehicleReg || s.code)} — ${s.scans} Public Safety Scans</b>
                <p style="margin:2px 0 0;font-size:12.5px;">Vehicle: ${escapeHtml(
                  s.vehicleModel || 'Vehicle',
                )} · Tag: <span class="mono">${escapeHtml(s.code)}</span></p>
                <div class="tl-time">Active Safety Protection</div>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      `;
    }

    if (tab === 'history') {
      return `
        <div class="timeline">
          <div class="tl-item">
            <div class="tl-dot" style="background:var(--primary);"></div>
            <div class="tl-body">
              <b>${g.qrs.length} QR Tags Registered for ${escapeHtml(g.ownerName)}</b>
              <p>Fleet connected with emergency contact alerts.</p>
              <div class="tl-time">${fmtDate(g.qrs[0]?.createdAt || Date.now())}</div>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  openDrawer(liveHead, tabs, 'fleet', render);
}

export async function openQrDrawer(id: string) {
  const head = `<div class="drawer-head"><div><h3 class="mono">QR Details</h3><div class="muted" style="font-size:12.5px;margin-top:2px;">Loading data…</div></div>
  <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
  openDrawer(head, [{ key: 'overview', label: 'Overview' }], 'overview', () => '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading QR data…</div>');

  try {
    const q: any = await apiClient.get(`/admin/qr/${id}`);
    const liveHead = `<div class="drawer-head">
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 class="mono" style="margin:0;font-size:16px;">${escapeHtml(q.code)}</h3>
          ${statusBadge(q.status ? q.status.toLowerCase() : 'available')}
        </div>
        <div class="muted" style="font-size:12.5px;margin-top:4px;">
          Batch: <b>${escapeHtml(q.batch || 'BATCH-PRIMARY')}</b> · ${q.vehicleReg ? `Linked to <b class="mono">${escapeHtml(q.vehicleReg)}</b>` : 'Unassigned'}
        </div>
      </div>
      <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div>
    </div>`;

    const tabs = [
      { key: 'overview', label: 'Overview' },
      { key: 'logs', label: 'Scan & Activity Logs' },
      { key: 'history', label: 'Lifecycle History' },
    ];

    function render(tab: string) {
      if (tab === 'overview') {
        const ownerOtherQrs = (DB.qrCodes || []).filter(
          (x: any) => x.id !== q.id && (x.ownerId === q.ownerId || (x.ownerName && x.ownerName === q.ownerName)),
        );

        return `
          <div class="kv-grid" style="grid-template-columns:repeat(2, 1fr);gap:12px;margin-bottom:16px;">
            <div class="kv"><span class="k">Status</span><span class="v">${statusBadge(q.status ? q.status.toLowerCase() : 'available')}</span></div>
            <div class="kv"><span class="k">Total Scans</span><span class="v" style="font-weight:700;color:var(--primary);">${q.scansCount ?? q.scans ?? 0} scans</span></div>
            <div class="kv"><span class="k">Assigned Vehicle</span><span class="v mono" style="font-weight:700;">${q.vehicleReg || '—'}</span></div>
            <div class="kv"><span class="k">Vehicle Model</span><span class="v">${escapeHtml(q.vehicleModel || '—')}</span></div>
            <div class="kv"><span class="k">Owner Name</span><span class="v" style="font-weight:600;">${escapeHtml(q.ownerName || '—')}</span></div>
            <div class="kv"><span class="k">Created Date</span><span class="v">${fmtDate(new Date(q.createdAt).getTime())}</span></div>
          </div>

          ${
            ownerOtherQrs.length > 0
              ? `
            <div style="margin:16px 0;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.18);border-radius:8px;padding:12px;">
              <div style="font-weight:700;font-size:12px;color:var(--primary);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                ${ic('car')} Other Vehicles Owned by ${escapeHtml(q.ownerName)} (${ownerOtherQrs.length})
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${ownerOtherQrs
                  .map(
                    (other: any) => `
                  <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);padding:6px 10px;border-radius:6px;font-size:12px;">
                    <div>
                      <b class="mono">${escapeHtml(other.vehicleReg || '—')}</b>
                      ${other.vehicleModel ? `<span class="muted" style="margin-left:6px;">${escapeHtml(other.vehicleModel)}</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span class="mono" style="color:var(--primary);">${escapeHtml(other.code)}</span>
                      <button class="btn btn-sm btn-ghost" data-action="view-qr" data-id="${other.id}" style="padding:2px 6px;font-size:11px;">View</button>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }

          <div class="divider" style="margin:16px 0;"></div>
          <div class="hstack" style="flex-wrap:wrap;gap:8px;">
            <button class="btn btn-sm" data-action="open-assign-qr" data-id="${q.id}">${ic('tag')} Assign / reassign</button>
            <button class="btn btn-sm" data-action="open-replace-qr" data-id="${q.id}">${ic('refresh')} Replace</button>
            <button class="btn btn-sm btn-ghost" data-action="print-single-qr" data-code="${q.code}" data-veh="${escapeHtml(
          q.vehicleReg || '',
        )}" data-owner="${escapeHtml(q.ownerName || '')}">
              ${ic('download')} Print Sticker
            </button>
            ${
              q.status !== 'SUSPENDED' && q.status !== 'suspended'
                ? `<button class="btn btn-sm btn-danger" data-action="suspend-qr" data-id="${q.id}">Deactivate</button>`
                : `<button class="btn btn-sm btn-primary" data-action="reactivate-qr" data-id="${q.id}">Reactivate</button>`
            }
          </div>
        `;
      }

      if (tab === 'logs') {
        const recentLogs = Array.isArray(q.recentScans) && q.recentScans.length > 0 ? q.recentScans : [];
        if (recentLogs.length > 0) {
          return `
            <div class="timeline">
              ${recentLogs
                .map(
                  (log: any) => `
                <div class="tl-item">
                  <div class="tl-dot" style="background:var(--success);"></div>
                  <div class="tl-body">
                    <b>${escapeHtml(log.actionTaken || 'Public Safety Scan Recorded')}</b>
                    <p style="margin:2px 0 0;font-size:12.5px;">
                      Location: <b>${escapeHtml(log.city || 'Scanner Location')}</b> · IP: <span class="mono">${escapeHtml(
                    log.ipAddress || '—',
                  )}</span>
                    </p>
                    <div class="tl-time">${timeAgo(new Date(log.scannedAt || log.createdAt || Date.now()).getTime())}</div>
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>
          `;
        }

        const scansCount = q.scansCount ?? q.scans ?? 0;
        if (scansCount > 0) {
          return `
            <div class="timeline">
              ${Array.from({ length: Math.min(5, scansCount) })
                .map(
                  (_, i) => `
                <div class="tl-item">
                  <div class="tl-dot" style="background:var(--success);"></div>
                  <div class="tl-body">
                    <b>Public Safety Scan Recorded</b>
                    <p style="margin:2px 0 0;font-size:12.5px;">Masked call & WhatsApp emergency alert option shown to scanner</p>
                    <div class="tl-time">${timeAgo(Date.now() - i * 1800000)}</div>
                  </div>
                </div>
              `,
                )
                .join('')}
            </div>
          `;
        }

        return renderEmpty('No scans yet', 'This QR code has not been scanned by the public yet.', 'qrcode');
      }

      if (tab === 'history') {
        const historyList =
          Array.isArray(q.history) && q.history.length > 0
            ? q.history
                .map(
                  (h: any) => `
              <div class="tl-item">
                <div class="tl-dot" style="${
                  h.reason === 'E-TAG_ORDERED'
                    ? 'background:var(--primary, #0066FF);box-shadow:0 0 8px rgba(0,102,255,0.5);'
                    : ''
                }"></div>
                <div class="tl-body">
                  <b>${escapeHtml(h.reason === 'E-TAG_ORDERED' ? 'E-Tag Order Placed' : h.reason || 'Lifecycle Update')}</b>
                  <p style="margin-top:2px;font-size:13px;">${escapeHtml(h.notes || h.vehicleReg || 'Tag updated')}</p>
                  <div class="tl-time">${
                    h.assignedAt ? fmtDate(new Date(h.assignedAt).getTime()) : fmtDate(new Date().getTime())
                  }</div>
                </div>
              </div>`,
                )
                .join('')
            : '';

        return `
          <div class="timeline">
            ${historyList}
            <div class="tl-item">
              <div class="tl-dot"></div>
              <div class="tl-body">
                <b>Status: ${escapeHtml(q.status)}</b>
                <p>Current lifecycle state</p>
                <div class="tl-time">${timeAgo(new Date(q.createdAt).getTime())}</div>
              </div>
            </div>
            <div class="tl-item">
              <div class="tl-dot" style="background:var(--success)"></div>
              <div class="tl-body">
                <b>QR generated</b>
                <p>Batch ${escapeHtml(q.batch || 'BATCH-PRIMARY')}</p>
                <div class="tl-time">${fmtDate(new Date(q.createdAt).getTime())}</div>
              </div>
            </div>
          </div>
        `;
      }
      return '';
    }

    openDrawer(liveHead, tabs, 'overview', render);
  } catch (err: any) {
    const errHead = `<div class="drawer-head"><div><h3>Error</h3></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic(
      'x',
    )}</button></div></div>`;
    openDrawer(
      errHead,
      [{ key: 'error', label: 'Error' }],
      'error',
      () =>
        `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load QR details: ${escapeHtml(
          err.message,
        )}</div>`,
    );
  }
}

/* =========================================================================
   LIVE ACTIVITY VIEW RENDERER
========================================================================= */
export function renderQrActivityHtml(qrCodes: any[]) {
  const scannedQrs = qrCodes.filter((q: any) => (q.scans || 0) > 0).sort((a: any, b: any) => (b.scans || 0) - (a.scans || 0));

  if (!scannedQrs.length) {
    return renderEmpty(
      'No scan activity recorded yet',
      'When members of the public scan a vehicle QR tag, safety interaction logs will appear here.',
      'clock',
    );
  }

  return `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.18);border-radius:10px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:8px;background:rgba(59,130,246,0.15);color:var(--primary);display:flex;align-items:center;justify-content:center;">
            ${ic('clock')}
          </div>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-bright);">Safety QR Tag Scan Interactions</div>
            <div class="muted" style="font-size:12px;">Active safety tags protecting vehicle owners with masked calling & emergency pings</div>
          </div>
        </div>
        <span class="chip" style="font-weight:700;color:var(--success);background:rgba(16,185,129,0.1);">
          ● ${scannedQrs.length} Active Monitored Vehicles
        </span>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:12px;">
        ${scannedQrs
          .map(
            (q: any) => `
            <div class="card" style="padding:16px;border-radius:10px;background:var(--surface);border:1px solid rgba(255,255,255,0.08);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="mono" style="font-weight:700;font-size:14px;color:var(--primary);">${escapeHtml(q.code)}</span>
                  ${statusBadge(q.status)}
                </div>
                <span class="badge badge-success" style="font-weight:700;">${q.scans} Scans</span>
              </div>

              <div class="kv-grid" style="grid-template-columns:repeat(2, 1fr);gap:8px;margin-bottom:12px;font-size:12px;">
                <div class="kv">
                  <span class="k" style="font-size:11px;">Vehicle</span>
                  <span class="v mono" style="font-weight:700;">${escapeHtml(q.vehicleReg || '—')}</span>
                </div>
                <div class="kv">
                  <span class="k" style="font-size:11px;">Owner</span>
                  <span class="v" style="font-weight:600;">${escapeHtml(q.ownerName || '—')}</span>
                </div>
                <div class="kv">
                  <span class="k" style="font-size:11px;">Batch</span>
                  <span class="v">${escapeHtml(q.batch || '—')}</span>
                </div>
                <div class="kv">
                  <span class="k" style="font-size:11px;">Created</span>
                  <span class="v">${fmtDate(q.createdAt)}</span>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;">
                <button class="btn btn-sm btn-ghost" data-action="view-qr" data-id="${q.id}" style="padding:4px 10px;font-size:12px;cursor:pointer;">
                  ${ic('eye')} View Activity Log
                </button>
              </div>
            </div>
          `,
          )
          .join('')}
      </div>
    </div>
  `;
}

let currentQrViewMode: 'owner' | 'flat' | 'activity' = 'owner';

export function updateQrAuxiliaryViews() {
  const actEl = $('view-qr-activity');
  if (actEl) {
    actEl.innerHTML = renderQrActivityHtml(DB.qrCodes || []);
  }
}

/* =========================================================================
   ROUTE VIEW RENDERER
========================================================================= */
export function renderQrcodesView() {
  const st = tableState('qr');
  const viewEl = $('view');
  if (!viewEl) return;

  viewEl.innerHTML = `
    <div class="page-head">
      <div>
        <h1>QR Codes Management</h1>
        <p>Lifecycle of every vehicle safety QR: registration, vehicle linking, scan interactions & batch printing.</p>
      </div>
      <div class="page-head-actions">
        <button class="btn btn-ghost btn-sm" data-action="print-qr-batch">${ic('download')} Print Sheet</button>
        <button class="btn btn-primary" data-action="open-batch-qr">${ic('plus')} Batch Generate</button>
      </div>
    </div>

    <!-- KPI Stat Cards -->
    <div class="grid grid-4" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--primary)"></div>
        <div class="stat-label">Total QR Codes</div>
        <div class="stat-row"><span class="stat-num" id="kpi-total-qr">—</span></div>
        <div id="kpi-total-qr-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">— Active · — Available</div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--success)"></div>
        <div class="stat-label">Active on Vehicles</div>
        <div class="stat-row"><span class="stat-num" id="kpi-active-qr" style="color:var(--success)">—</span></div>
        <div id="kpi-active-qr-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">Protected & Live</div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--info, #3b82f6)"></div>
        <div class="stat-label">Vehicle Owners</div>
        <div class="stat-row"><span class="stat-num" id="kpi-owners-qr" style="color:var(--info, #3b82f6)">—</span></div>
        <div id="kpi-owners-qr-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">Multi-vehicle accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--warning)"></div>
        <div class="stat-label">Total Scan Activity</div>
        <div class="stat-row"><span class="stat-num" id="kpi-scans-qr" style="color:var(--warning)">—</span></div>
        <div id="kpi-scans-qr-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">Safety contact pings</div>
      </div>
    </div>

    <!-- Filter & View Switcher Toolbar -->
    <div class="toolbar" style="margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <div class="toolbar-search" style="min-width:280px;flex:1;">
        ${ic('search')}
        <input placeholder="Search owner name, vehicle reg, model, QR code, batch…" data-table-search="qr" value="${escapeHtml(
          st.search,
        )}">
      </div>

      <select data-table-filter="qr" data-filter-key="status" style="height:36px;border-radius:6px;background:var(--surface);border:1px solid rgba(255,255,255,0.1);padding:0 10px;font-size:13px;color:inherit;">
        <option value="">All statuses</option>
        ${['active', 'available', 'assigned', 'suspended', 'replaced']
          .map((s) => `<option value="${s}">${s[0].toUpperCase() + s.slice(1)}</option>`)
          .join('')}
      </select>

      <!-- View Switcher -->
      <div class="view-switcher-group" style="display:flex;align-items:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:3px;gap:2px;">
        <button class="btn btn-sm ${
          currentQrViewMode === 'owner' ? 'btn-sub active' : 'btn-ghost'
        }" data-action="toggle-qr-view" data-view="owner" style="padding:4px 10px;font-size:12px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
          ${ic('users')} Grouped by User (<span id="qr-owner-pill-count">0</span>)
        </button>
        <button class="btn btn-sm ${
          currentQrViewMode === 'flat' ? 'btn-sub active' : 'btn-ghost'
        }" data-action="toggle-qr-view" data-view="flat" style="padding:4px 10px;font-size:12px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
          ${ic('qrcode')} Individual QRs (<span id="qr-pill-count">0</span>)
        </button>
        <button class="btn btn-sm ${
          currentQrViewMode === 'activity' ? 'btn-sub active' : 'btn-ghost'
        }" data-action="toggle-qr-view" data-view="activity" style="padding:4px 10px;font-size:12px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
          ${ic('clock')} Live Activity
        </button>
      </div>

      <span class="chip" id="qr-count-chip">${ic('qrcode')} Loading codes…</span>
    </div>

    <!-- Views Container -->
    <div id="view-qr-table" style="display:${currentQrViewMode !== 'activity' ? 'block' : 'none'};">
      <div id="tbl-qr">${Array.isArray(DB.qrCodes) && DB.qrCodes.length > 0 ? '' : renderSkeletonTable(6, 6)}</div>
    </div>

    <div id="view-qr-activity" style="display:${currentQrViewMode === 'activity' ? 'block' : 'none'};">
      <div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading scan activity logs…</div>
    </div>
  `;

  const renderQrData = () => {
    const allQrs = DB.qrCodes || [];
    const total = allQrs.length;
    const active = allQrs.filter((q: any) => q.status === 'active' || q.status === 'assigned').length;
    const available = allQrs.filter((q: any) => q.status === 'available').length;
    const totalScans = allQrs.reduce((sum: number, q: any) => sum + (q.scans || 0), 0);
    const ownerGroups = getQrsByOwner(allQrs);
    const uniqueOwners = ownerGroups.filter((g: any) => g.ownerKey !== 'unassigned').length;

    // Update KPI Stat cards
    const kpiTotal = $('kpi-total-qr');
    if (kpiTotal) kpiTotal.innerText = String(total);
    const kpiTotalSub = $('kpi-total-qr-sub');
    if (kpiTotalSub) kpiTotalSub.innerHTML = `<b>${active}</b> Active · <b>${available}</b> Available`;

    const kpiActive = $('kpi-active-qr');
    if (kpiActive) kpiActive.innerText = String(active);
    const kpiActiveSub = $('kpi-active-qr-sub');
    if (kpiActiveSub) kpiActiveSub.innerText = `${active} Vehicles Protected`;

    const kpiOwners = $('kpi-owners-qr');
    if (kpiOwners) kpiOwners.innerText = String(uniqueOwners);
    const kpiOwnersSub = $('kpi-owners-qr-sub');
    if (kpiOwnersSub) kpiOwnersSub.innerText = `${total} QRs across ${uniqueOwners} users`;

    const kpiScans = $('kpi-scans-qr');
    if (kpiScans) kpiScans.innerText = String(totalScans);

    // Update Toolbar chips & counts
    const chip = $('qr-count-chip');
    if (chip) chip.innerHTML = `${ic('qrcode')} ${total} Codes · ${totalScans} Scans`;

    const pillCount = $('qr-pill-count');
    if (pillCount) pillCount.innerText = String(total);

    const ownerPill = $('qr-owner-pill-count');
    if (ownerPill) ownerPill.innerText = String(uniqueOwners);

    // Register Table based on current view mode
    registerTable('qr', () => {
      updateQrAuxiliaryViews();

      if (currentQrViewMode === 'flat') {
        return buildTable('qr', qrColumns(), DB.qrCodes, {
          onRowClick: 'view-qr',
          perPage: 10,
          filterFn: (r: any, f: any) => !f.status || r.status === f.status,
          rowActions: (r: any) =>
            `<div class="kebab-wrap"><button class="btn-icon" data-action="row-menu" data-menu="qr" data-id="${
              r.id
            }">${ic('kebab')}</button></div>`,
          emptyTitle: 'No QR codes match',
          emptyBody: 'Try a different status filter or search term.',
        });
      }

      // Default: Grouped by User (1 row per user, containing all their vehicles and QR codes)
      const groups = getQrsByOwner(DB.qrCodes || []).map((g: any) => ({
        id: g.ownerKey,
        ownerKey: g.ownerKey,
        ownerName: g.ownerName,
        ownerPhone: g.ownerPhone,
        ownerEmail: g.ownerEmail,
        ownerId: g.ownerId,
        qrs: g.qrs,
        totalScans: g.totalScans,
        activeCount: g.activeCount,
        status: g.activeCount > 0 ? 'active' : g.qrs[0]?.status || 'available',
      }));

      return buildTable('qr', ownerColumns(), groups, {
        onRowClick: 'view-owner-fleet',
        perPage: 10,
        filterFn: (r: any, f: any) =>
          !f.status || r.status === f.status || (f.status === 'active' && r.activeCount > 0),
        emptyTitle: 'No vehicle owners match',
        emptyBody: 'Try a different status filter or search term.',
      });
    });

    refreshTable('qr');
    updateQrAuxiliaryViews();
  };

  if (Array.isArray(DB.qrCodes) && DB.qrCodes.length > 0) {
    renderQrData();
  }

  syncQrCodes()
    .then(() => {
      renderQrData();
    })
    .catch((err) => {
      const tbl = $('tbl-qr');
      if (tbl) {
        tbl.innerHTML = `
          <div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);">
            <div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic(
              'alert',
            )} Failed to load QR codes</div>
            <p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p>
            <button class="btn btn-sm btn-ghost" data-action="retry-qr">Retry</button>
          </div>
        `;
      }
    });
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerQrcodesSection() {
  registerRoute('qr', renderQrcodesView);

  registerActions({
    'toggle-qr-view': (el: HTMLElement) => {
      const mode = (el.dataset.view as any) || 'owner';
      currentQrViewMode = mode;

      const viewTable = $('view-qr-table');
      const viewAct = $('view-qr-activity');

      $$('[data-action="toggle-qr-view"]').forEach((btn: any) => {
        btn.className = btn.dataset.view === mode ? 'btn btn-sm btn-sub active' : 'btn btn-sm btn-ghost';
      });

      if (viewTable) viewTable.style.display = mode !== 'activity' ? 'block' : 'none';
      if (viewAct) viewAct.style.display = mode === 'activity' ? 'block' : 'none';

      if (mode === 'activity') {
        updateQrAuxiliaryViews();
      } else {
        refreshTable('qr');
      }
    },
    'view-owner-fleet': (el: HTMLElement) => {
      const id = el.dataset.id;
      if (id) openOwnerFleetDrawer(id);
    },
    'print-owner-qrs': (el: HTMLElement) => {
      const id = el.dataset.id;
      if (id) printOwnerQrs(id);
    },
    'open-batch-qr': () => openBatchQrModal(),
    'print-qr-batch': () => openPrintQrModal(),
    'print-single-qr': (el: HTMLElement) => {
      const code = el.dataset.code;
      const veh = el.dataset.veh;
      const owner = el.dataset.owner;
      if (code) printSingleQr(code, veh, owner);
    },
    'open-assign-qr': (el: HTMLElement) => {
      if (el.dataset.id) openAssignQrModal(el.dataset.id);
    },
    'open-replace-qr': (el: HTMLElement) => {
      if (el.dataset.id) openReplaceQrModal(el.dataset.id);
    },
    'suspend-qr': (el: HTMLElement) => {
      if (el.dataset.id) suspendQr(el.dataset.id);
    },
    'reactivate-qr': (el: HTMLElement) => {
      if (el.dataset.id) reactivateQr(el.dataset.id);
    },
    'view-qr': (el: HTMLElement) => {
      if (el.dataset.id) openQrDrawer(el.dataset.id);
    },
    'retry-qr': () => {
      syncQrCodes()
        .then(() => renderQrcodesView())
        .catch(() => renderQrcodesView());
    },
  });

  registerRowMenuProvider('qr', (id: string) => {
    const q = DB.qrCodes.find((x: any) => x.id === id);
    const items: any[] = [
      { label: 'View Details', icon: 'eye', action: () => openQrDrawer(id) },
      {
        label: 'Print Sticker',
        icon: 'download',
        action: () => printSingleQr(q?.code || id, q?.vehicleReg, q?.ownerName),
      },
      { label: 'Assign / Reassign', icon: 'tag', action: () => openAssignQrModal(id) },
      { label: 'Replace QR', icon: 'refresh', action: () => openReplaceQrModal(id) },
    ];
    if (q && q.status !== 'suspended') {
      items.push({ label: 'Deactivate', icon: 'x', danger: true, action: () => suspendQr(id) });
    } else {
      items.push({ label: 'Reactivate', icon: 'check', action: () => reactivateQr(id) });
    }
    return items;
  });
}

// Auto-register upon import
registerQrcodesSection();

export default function Qrcodes() {
  useEffect(() => {
    renderQrcodesView();
  }, []);

  return <div id="qr-component-root" />;
}
