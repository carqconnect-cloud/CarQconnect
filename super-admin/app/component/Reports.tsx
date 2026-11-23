'use client';

import React from 'react';
import {
  $,
  $q,
  $$,
  ic,
  escapeHtml,
  apiClient,
  DB,
  showToast,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportReport(key: string, btn?: HTMLElement) {
  if (btn) {
    btn.setAttribute('disabled', 'true');
    btn.classList.add('loading');
  }
  showToast('Preparing export...');
  try {
    const csvContent = await apiClient.get<string>(`/admin/reports/${encodeURIComponent(key)}/export`);
    if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
      showToast('Nothing to export for this report yet.', 'danger');
      return;
    }
    const filename = `${key}_report_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(filename, csvContent);
    showToast('Export ready — check your downloads.');
  } catch (e: any) {
    console.warn('Backend CSV export failed, checking fallback', e);
    showToast('Could not download the export: ' + (e?.message || 'API error'), 'danger');
  } finally {
    if (btn) {
      btn.removeAttribute('disabled');
      btn.classList.remove('loading');
    }
  }
}

export function renderReportsRoute() {
  const reportDefs = [
    { key: 'users', label: 'User growth', icon: 'users', count: DB.users.length },
    { key: 'revenue', label: 'Revenue', icon: 'award', count: DB.orders.length },
    { key: 'qr-scans', label: 'QR scans', icon: 'qrcode', count: DB.qrCodes.length },
    { key: 'device-activation', label: 'Device activations', icon: 'satellite', count: DB.gpsDevices.length },
    { key: 'membership-conv', label: 'Membership conversion', icon: 'award', count: DB.subscriptions.length },
    { key: 'support-volume', label: 'Support volume', icon: 'headset', count: DB.tickets.length },
    { key: 'ai-containment', label: 'AI containment', icon: 'cpu', count: DB.aiLogs.length },
    { key: 'call-outcomes', label: 'Call outcomes', icon: 'phone', count: DB.crmCalls.length },
  ];

  const view = $('view');
  if (!view) return;
  view.innerHTML = `
    <div class="page-head"><div><h1>Reports & exports</h1><p>Operational reports across the ecosystem, exportable to CSV for further analysis.</p></div></div>
    <div class="grid grid-3" id="reports-grid">
      ${reportDefs.map(r => `<div class="card">
        <div class="hstack"><div class="integration-icon" style="background:var(--accent-bg);color:var(--accent);">${ic(r.icon)}</div>
          <div><div style="font-weight:700;font-size:13.5px;">${r.label}</div><div class="cell-sub" id="report-count-${r.key}">${r.count} records</div></div>
        </div>
        <button class="btn btn-sm" style="margin-top:12px;width:100%;justify-content:center;" data-action="export-report" data-key="${r.key}">${ic('download')} Export CSV</button>
      </div>`).join('')}
    </div>
  `;

  apiClient.get('/admin/reports').then((res: any) => {
    const list = Array.isArray(res) ? res : (res?.data || []);
    list.forEach((item: any) => {
      const el = $(`report-count-${item.key}`);
      if (el && typeof item.totalCount === 'number') {
        el.textContent = `${item.totalCount} records`;
      }
    });
  }).catch((err) => {
    console.warn('Live report counts fetch notice:', err);
  });
}

registerRoute('reports', renderReportsRoute);

registerActions({
  'export-report': (el: HTMLElement) => exportReport(el.dataset.key!, el),
});

export default function Reports() {
  React.useEffect(() => {
    renderReportsRoute();
  }, []);

  return (
    <div id="reports-root">
      <div id="view"></div>
    </div>
  );
}
