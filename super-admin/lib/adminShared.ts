/**
 * Fioner Control — Super Admin Shared Core & UI Runtime
 * ------------------------------------------------------------------
 * Centralized state, DOM helpers, routing registry, table builders,
 * drawer/modal controllers, icons, and formatting utilities.
 */

import { apiClient, ApiError } from './apiClient';

export { apiClient, ApiError };

export const DB_KEY = 'fioner_admin_db_v1';
export const THEME_KEY = 'fioner_admin_theme';

export const $ = (id: string): any => (typeof document !== 'undefined' ? document.getElementById(id) : null);
export const $q = (sel: string): any => (typeof document !== 'undefined' ? document.querySelector(sel) : null);
export const $$ = (sel: string): any[] => (typeof document !== 'undefined' ? Array.from(document.querySelectorAll(sel)) : []);

/* =========================================================================
   ICONS
========================================================================= */
export const ICONS: Record<string, string> = {
  grid: '<rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.3"/><rect x="11" y="2.5" width="6.5" height="6.5" rx="1.3"/><rect x="2.5" y="11" width="6.5" height="6.5" rx="1.3"/><rect x="11" y="11" width="6.5" height="6.5" rx="1.3"/>',
  users: '<circle cx="7.2" cy="7" r="2.9"/><path d="M2 17c0-2.9 2.3-5.2 5.2-5.2S12.4 14.1 12.4 17"/><circle cx="14.5" cy="7.4" r="2.1"/><path d="M13.3 11.9c2.3.4 3.9 2.3 3.9 5.1"/>',
  car: '<path d="M3.5 14V9.6l1.8-4.4h9.4l1.8 4.4V14"/><path d="M3.5 14h13"/><circle cx="6.6" cy="14.4" r="1.5"/><circle cx="14.4" cy="14.4" r="1.5"/>',
  qrcode: '<rect x="2.5" y="2.5" width="5.5" height="5.5"/><rect x="12" y="2.5" width="5.5" height="5.5"/><rect x="2.5" y="12" width="5.5" height="5.5"/><path d="M12 12h2.5v2.5H12zM17.5 12v2.5M12 17.5h2.5M17.5 15.9v1.6h-1.6"/>',
  satellite: '<circle cx="10" cy="10" r="1.8"/><path d="M10 2v2.6M10 15.4V18M2 10h2.6M15.4 10H18M4.6 4.6l1.8 1.8M13.6 13.6l1.8 1.8M15.4 4.6l-1.8 1.8M6.4 13.6l-1.8 1.8"/>',
  box: '<path d="M2.7 6.3l7.3-3.3 7.3 3.3-7.3 3.3-7.3-3.3z"/><path d="M2.7 6.3v7.4l7.3 3.3 7.3-3.3V6.3"/><path d="M10 9.6v7.4"/>',
  archive: '<rect x="2.5" y="3.5" width="15" height="3.5" rx="1"/><path d="M4 7v7.5a1.8 1.8 0 001.8 1.8h8.4A1.8 1.8 0 0016 14.5V7"/><path d="M8.2 10.8h3.6"/>',
  award: '<circle cx="10" cy="7" r="4.2"/><path d="M7.1 10.6L6 17.8l4-2.4 4 2.4-1.1-7.2"/>',
  alert: '<path d="M10 2.6l7.8 13.5H2.2L10 2.6z"/><path d="M10 8.3v3.3"/><circle cx="10" cy="14" r=".9" fill="currentColor" stroke="none"/>',
  headset: '<path d="M3.5 11.6a6.5 6.5 0 0113 0"/><rect x="2.5" y="11.6" width="3.3" height="5" rx="1.4"/><rect x="14.2" y="11.6" width="3.3" height="5" rx="1.4"/><path d="M15.8 16.6a3.3 3.3 0 01-3.3 1.7h-1.5"/>',
  cpu: '<rect x="6" y="6" width="8" height="8" rx="1.3"/><rect x="2.4" y="8.4" width="2" height="3.2"/><rect x="15.6" y="8.4" width="2" height="3.2"/><rect x="8.4" y="2.4" width="3.2" height="2"/><rect x="8.4" y="15.6" width="3.2" height="2"/><circle cx="10" cy="10" r="1.7"/>',
  phone: '<path d="M4.4 3.3h2.8l1.3 3.5-1.8 1.3a10.5 10.5 0 005.2 5.2l1.3-1.8 3.5 1.3v2.8a1.7 1.7 0 01-1.9 1.7A15.3 15.3 0 012.7 5.2 1.7 1.7 0 014.4 3.3z"/>',
  image: '<rect x="2.5" y="3.5" width="15" height="13" rx="1.8"/><circle cx="7.5" cy="8.4" r="1.5"/><path d="M3.4 15.5l4.3-4.3 3 3 3.8-3.8 2.5 2.5"/>',
  chart: '<path d="M3.5 17V9.5M9.5 17V3.5M15.5 17v-6"/><path d="M2.5 17h15"/>',
  shield: '<path d="M10 2.6l6.1 2.6v5.2c0 4.3-3 6.5-6.1 7.8-3.1-1.3-6.1-3.5-6.1-7.8V5.2L10 2.6z"/>',
  plug: '<path d="M7 2.6v3.4M13 2.6v3.4"/><rect x="5" y="6" width="10" height="5.2" rx="1.8"/><path d="M10 11.2v2.6a2.6 2.6 0 01-2.6 2.6H6.3"/>',
  search: '<circle cx="8.6" cy="8.6" r="5.6"/><path d="M16.5 16.5l-3.7-3.7"/>',
  bell: '<path d="M5.2 8a4.8 4.8 0 019.6 0c0 3.4 1.3 4.7 1.3 4.7H3.9S5.2 11.4 5.2 8z"/><path d="M8.5 15.4a1.5 1.5 0 003 0"/>',
  sun: '<circle cx="10" cy="10" r="3.4"/><path d="M10 2.6v1.9M10 15.5v1.9M2.6 10h1.9M15.5 10h1.9M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6L14 6M6 14l-1.4 1.4"/>',
  moon: '<path d="M17 12.9a7.2 7.2 0 11-8.5-9.6 5.9 5.9 0 008.5 9.6z"/>',
  chevDown: '<path d="M5 7.5l5 5 5-5"/>',
  chevRight: '<path d="M7.5 5l5 5-5 5"/>',
  kebab: '<circle cx="10" cy="4.2" r="1.25"/><circle cx="10" cy="10" r="1.25"/><circle cx="10" cy="15.8" r="1.25"/>',
  x: '<path d="M5 5l10 10M15 5L5 15"/>',
  check: '<path d="M3.8 10.4l3.8 3.8 8.6-9.2"/>',
  plus: '<path d="M10 3.5v13M3.5 10h13"/>',
  pencil: '<path d="M3.5 16.5V13l9.6-9.6 3.5 3.5-9.6 9.6H3.5z"/>',
  trash: '<path d="M3.8 5.6h12.4M7.7 5.6v-2h4.6v2M6.5 5.6l.9 11h5.2l.9-11"/>',
  sort: '<path d="M6.5 3v11M6.5 3L4 5.5M6.5 3L9 5.5"/><path d="M13.5 17V6M13.5 17l2.5-2.5M13.5 17L11 14.5"/>',
  download: '<path d="M10 3v9M6.5 8.5L10 12l3.5-3.5"/><path d="M4 15.5h12"/>',
  mapPin: '<path d="M10 17.6s5.6-5.2 5.6-9.4a5.6 5.6 0 10-11.2 0c0 4.2 5.6 9.4 5.6 9.4z"/><circle cx="10" cy="8.1" r="1.9"/>',
  clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6.2v4l2.8 1.8"/>',
  filter: '<path d="M3 4.2h14L11.3 10.9V16l-2.6 1.6v-6.7L3 4.2z"/>',
  menu: '<path d="M3.2 5.5h13.6M3.2 10h13.6M3.2 14.5h13.6"/>',
  logout: '<path d="M8.4 4.2H4.2v11.6h4.2"/><path d="M12.5 14l3.5-4-3.5-4"/><path d="M15.7 10H7.8"/>',
  arrowLeft: '<path d="M12.5 4.6L6.9 10l5.6 5.4"/><path d="M4 10h13.5"/>',
  externalLink: '<path d="M8.5 4.5H4.5v11h11v-4"/><path d="M9.5 10.5l7-7"/><path d="M12.5 3.5h4v4"/>',
  truck: '<path d="M2.5 5.5h8.5v7.5h-8.5z"/><path d="M11 8.5h3.3l2.2 2.5v2h-5.5z"/><circle cx="5.5" cy="15" r="1.6"/><circle cx="13.5" cy="15" r="1.6"/>',
  tag: '<path d="M9.5 2.8H4.2A1.4 1.4 0 002.8 4.2v5.3c0 .4.15.7.4 1l7 7c.55.55 1.45.55 2 0l5.3-5.3c.55-.55.55-1.45 0-2l-7-7c-.27-.27-.63-.42-1-.42z"/><circle cx="6.4" cy="6.4" r="1.1"/>',
  message: '<path d="M3 4.5h14v9.5H8.5L4.5 17v-3H3z"/>',
  info: '<circle cx="10" cy="10" r="7.3"/><path d="M10 9.2v4.4"/><circle cx="10" cy="6.6" r=".9" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M16.2 8.5A6.3 6.3 0 105 12.6"/><path d="M16.2 4.5v4h-4"/>',
  book: '<path d="M3.5 4.2h6.3v12.6H5.3a1.8 1.8 0 01-1.8-1.8V4.2z"/><path d="M16.5 4.2h-6.3v12.6h4.5a1.8 1.8 0 001.8-1.8V4.2z"/>',
  star: '<path d="M10 2.8l2.2 4.6 5 .7-3.6 3.5.85 5-4.45-2.4-4.45 2.4.85-5-3.6-3.5 5-.7L10 2.8z"/>',
  eye: '<path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.4"/>'
};

export function ic(name: string, cls = ''): string {
  return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
}

/* =========================================================================
   UTILITIES
========================================================================= */
export function uid(prefix: string): string { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
export function escapeHtml(s: any): string { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)); }
export function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
export function randInt(a: number, b: number): number { return Math.floor(Math.random() * (b - a + 1)) + a; }
export function fmtINR(n: number): string { return '₹' + Math.round(n).toLocaleString('en-IN'); }
export function fmtDate(ts: number | string | Date): string { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
export function fmtDateTime(ts: number | string | Date): string { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' + new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
export function timeAgo(ts: number | string | Date): string {
  const diff = Date.now() - new Date(ts).getTime(), m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now'; if (m < 60) return m + 'm ago'; if (h < 24) return h + 'h ago'; return d + 'd ago';
}
export function initials(name: string): string { return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
export function daysFromNow(n: number): number { return Date.now() + n * 86400000; }
export function debounce(fn: (...args: any[]) => void, ms: number) {
  let t: any;
  return function (...a: any[]) { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); };
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === 'undefined') return;
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

/* =========================================================================
   DATABASE SEED & STATE
========================================================================= */
export function seedDatabase(): any {
  const now = Date.now();
  return {
    users: [], vehicles: [], qrCodes: [], gpsDevices: [], products: [], orders: [],
    plans: [], subscriptions: [], sosEvents: [], tickets: [], aiKnowledge: [],
    aiIntents: [], aiTools: [], escalationRules: [], aiLogs: [], aiAnalytics: null,
    banners: [], coupons: [], campaigns: [], crmCalls: [], leads: [], crmOverview: null,
    roles: [], meta: { seededAt: now }
  };
}

export let DB: any = seedDatabase();

export function loadDB(): any {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(DB_KEY); } catch (e) { }
  }
  DB = seedDatabase();
  return DB;
}

export function saveDB(): void {
  // Persistence strictly managed by backend PostgreSQL database.
}

export function resetDB(): void {
  DB = loadDB();
}

/* =========================================================================
   UI PRIMITIVES (Badges, Empty states, SVG Charts)
========================================================================= */
export function badge(text: string, type: string): string {
  return '<span class="badge badge-' + type + '"><span class="dot"></span>' + escapeHtml(text) + '</span>';
}

export function statusBadge(status: any): string {
  const map: Record<string, string> = {
    active: 'success', assigned: 'info', available: 'neutral', suspended: 'danger', replaced: 'neutral', maintenance: 'warning', unassigned: 'neutral',
    Paid: 'success', Pending: 'warning', Failed: 'danger', Refunded: 'neutral',
    Placed: 'info', Confirmed: 'info', Shipped: 'warning', Delivered: 'success', Returned: 'neutral', Cancelled: 'danger',
    open: 'warning', in_progress: 'info', escalated: 'danger', resolved: 'success',
    OPEN: 'warning', IN_PROGRESS: 'info', ESCALATED: 'danger', RESOLVED: 'success',
    pending: 'warning', acknowledged: 'info',
    published: 'success', draft: 'neutral',
    live: 'success', scheduled: 'info', Scheduled: 'info', Sent: 'success', Draft: 'neutral',
    connected: 'success', degraded: 'warning', down: 'danger',
    New: 'info', Contacted: 'warning', Interested: 'success', 'Follow-up': 'warning', Converted: 'success', 'Not Interested': 'danger',
  };
  const label = String(status || '').replace(/_/g, ' ');
  return badge(label.charAt(0).toUpperCase() + label.slice(1), map[status] || 'neutral');
}

export function renderPriorityBadge(priority: string): string {
  const p = String(priority || '').toUpperCase();
  if (p === 'URGENT') return badge('Urgent', 'danger');
  if (p === 'HIGH') return badge('High', 'danger');
  if (p === 'MEDIUM') return badge('Medium', 'warning');
  return badge(p ? p.charAt(0) + p.slice(1).toLowerCase() : 'Low', 'neutral');
}

export function avatarChip(name: string): string {
  return '<div class="name-cell"><div class="avatar-sm">' + initials(name) + '</div><span>' + escapeHtml(name) + '</span></div>';
}

export function renderEmpty(title: string, body: string, iconName = ''): string {
  return '<div class="empty-state">' + ic(iconName || 'search', 'xl') + '<h4>' + escapeHtml(title) + '</h4><p>' + escapeHtml(body) + '</p></div>';
}

export function renderSkeletonTable(rows = 6, cols = 5): string {
  const colWidths = ['28%', '30%', '18%', '14%', '10%'];
  return `
    <div class="skeleton-table-wrap">
      <div class="skeleton-head-row">
        ${Array.from({ length: cols })
          .map((_, i) => `<div class="skeleton-shimmer skeleton-head-col" style="width:${colWidths[i % colWidths.length]};"></div>`)
          .join('')}
      </div>
      <div class="skeleton-body-wrap">
        ${Array.from({ length: rows })
          .map(() => `
            <div class="skeleton-data-row">
              ${Array.from({ length: cols })
                .map((_, i) => `<div class="skeleton-shimmer skeleton-cell" style="width:${colWidths[i % colWidths.length]};"></div>`)
                .join('')}
            </div>
          `)
          .join('')}
      </div>
    </div>
  `;
}

export function svgSpark(values: number[], color: string): string {
  const w = 100, h = 28, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pts = values.map((v, i) => (i / (values.length - 1)) * w + ',' + (h - ((v - min) / (max - min || 1)) * h)).join(' ');
  const len = values.length * 20;
  return '<svg width="100%" height="30" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:' + len + ';stroke-dashoffset:' + len + '" data-animate="draw"/></svg>';
}

export function svgBarChart(labels: string[], values: number[], color: string): string {
  const w = 320, h = 140, gap = 10, barW = (w - gap * (values.length + 1)) / values.length, max = Math.max(...values, 1);
  let bars = '', labs = '';
  values.forEach((v, i) => {
    const bh = (v / max) * (h - 24);
    const x = gap + i * (barW + gap);
    bars += '<rect data-animate="grow" data-h="' + bh + '" x="' + x + '" y="' + (h - 24) + '" width="' + barW + '" height="0" rx="2" fill="' + color + '"></rect>';
    labs += '<text x="' + (x + barW / 2) + '" y="' + (h - 6) + '" font-size="8.5" fill="var(--text-faint)" text-anchor="middle" font-family="IBM Plex Mono, monospace">' + labels[i] + '</text>';
  });
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="150">' + bars + labs + '</svg>';
}

export function svgLineChart(labels: string[], values: number[], color: string): string {
  const w = 360, h = 170, pad = 26, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return x + ',' + y;
  }).join(' ');
  const labs = labels.map((l, i) => {
    const x = pad + (i / (labels.length - 1)) * (w - pad * 2);
    return '<text x="' + x + '" y="' + (h - 6) + '" font-size="9" fill="var(--text-faint)" text-anchor="middle" font-family="IBM Plex Mono, monospace">' + l + '</text>';
  }).join('');
  const grid = [0, 1, 2].map(i => '<line x1="' + pad + '" x2="' + (w - pad) + '" y1="' + (pad + i * 44) + '" y2="' + (pad + i * 44) + '" stroke="var(--border)" stroke-dasharray="4 5"/>').join('');
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="190">' + grid + '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" data-animate="draw" style="stroke-dasharray:600;stroke-dashoffset:600"></polyline>' + labs + '</svg>';
}

export function svgDonut(segments: { label?: string; value: number; color: string }[]): string {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 40, c = 2 * Math.PI * r; let offset = 0;
  const circles = segments.map(s => {
    const frac = s.value / total, len = frac * c;
    const el = '<circle data-animate="draw" cx="60" cy="60" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 60 60)"></circle>';
    offset += len; return el;
  }).join('');
  return '<svg viewBox="0 0 120 120" width="120" height="120">' + circles + '<circle cx="60" cy="60" r="26" fill="var(--surface)"></circle></svg>';
}

export function mountAnimations(): void {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => {
    $$('[data-animate="grow"]').forEach(el => {
      const h = parseFloat(el.dataset.h);
      requestAnimationFrame(() => { el.style.transition = 'height .7s cubic-bezier(.2,.8,.2,1), y .7s cubic-bezier(.2,.8,.2,1)'; el.setAttribute('height', h); el.setAttribute('y', 116 - h); });
    });
    $$('[data-animate="draw"]').forEach(el => {
      requestAnimationFrame(() => { el.style.transition = 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)'; if (el.tagName === 'polyline') el.style.strokeDashoffset = '0'; });
    });
    $$('.stat-num[data-target]').forEach(el => {
      const target = parseFloat(el.dataset.target); const isMoney = el.dataset.money === '1';
      let start = 0; const dur = 650; const t0 = performance.now();
      function step(t: number) {
        const p = Math.min(1, (t - t0) / dur); const val = start + (target - start) * (1 - Math.pow(1 - p, 3));
        el.textContent = isMoney ? fmtINR(val) : Math.round(val).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
    $$('.progress-fill[data-target]').forEach(el => {
      requestAnimationFrame(() => { el.style.width = el.dataset.target + '%'; });
    });
  });
}

/* =========================================================================
   TABLE MANAGEMENT
========================================================================= */
export const state: any = {
  route: { name: 'dashboard', params: [] },
  tables: {},
  drawerTab: null,
  drawerRenderTab: null,
  modalSubmit: null
};

export function tableState(key: string): any {
  if (!state.tables[key]) state.tables[key] = { search: '', sort: null, page: 1, filters: {} };
  return state.tables[key];
}

export const TABLE_RENDERERS: Record<string, () => any> = {};
export function registerTable(key: string, fn: () => any): void { TABLE_RENDERERS[key] = fn; }
export function refreshTable(key: string): void {
  const el = $('tbl-' + key);
  if (el && TABLE_RENDERERS[key]) {
    const res = TABLE_RENDERERS[key]();
    if (typeof res === 'string') el.innerHTML = res;
  }
}

export function queryRows(key: string, allRows: any[], columns: any[], perPage: number, filterFn?: any) {
  const st = tableState(key);
  let rows = allRows;
  if (filterFn) rows = rows.filter(r => filterFn(r, st.filters));
  if (st.search) {
    const q = st.search.toLowerCase();
    rows = rows.filter(r => columns.some(c => {
      const v = c.searchValue ? c.searchValue(r) : r[c.key];
      return String(v === undefined || v === null ? '' : v).toLowerCase().includes(q);
    }));
  }
  if (st.sort && st.sort.key) {
    const col = columns.find(c => c.key === st.sort.key);
    if (col) {
      rows = rows.slice().sort((a, b) => {
        const av = col.sortValue ? col.sortValue(a) : a[col.key], bv = col.sortValue ? col.sortValue(b) : b[col.key];
        let cmp = 0; if (av > bv) cmp = 1; else if (av < bv) cmp = -1;
        return st.sort.dir === 'desc' ? -cmp : cmp;
      });
    }
  }
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (st.page > totalPages) st.page = totalPages;
  if (st.page < 1) st.page = 1;
  const pageRows = rows.slice((st.page - 1) * perPage, st.page * perPage);
  return { pageRows, total, totalPages, page: st.page };
}

export function sortCaret(st: any, key: string): string {
  if (!st.sort || st.sort.key !== key) return '';
  return '<span class="sort-caret">' + (st.sort.dir === 'asc' ? '▲' : '▼') + '</span>';
}

export function buildTable(key: string, columns: any[], allRows: any[], opts: any = {}): string {
  const perPage = opts.perPage || 8;
  const { pageRows, total, totalPages, page } = queryRows(key, allRows, columns, perPage, opts.filterFn);
  const st = tableState(key);
  if (!total) {
    return renderEmpty(opts.emptyTitle || 'No records match', opts.emptyBody || 'Try a different search term or clear your filters.');
  }
  const head = columns.map(c => {
    const sortAttr = c.sortable ? ' data-action="sort-table" data-table="' + key + '" data-col="' + c.key + '"' : '';
    return '<th class="' + (c.align === 'right' ? 'ta-r' : '') + '"' + sortAttr + '>' + c.label + (c.sortable ? sortCaret(st, c.key) : '') + '</th>';
  }).join('');
  const body = pageRows.map(r => {
    const cells = columns.map(c => '<td class="' + (c.align === 'right' ? 'ta-r' : '') + '">' + (c.render ? c.render(r) : escapeHtml(r[c.key])) + '</td>').join('');
    const actionsCell = opts.rowActions ? '<td class="ta-r">' + opts.rowActions(r) + '</td>' : '';
    const clickAttr = opts.onRowClick ? ' class="row-click" data-action="' + opts.onRowClick + '" data-id="' + r.id + '"' : '';
    return '<tr' + clickAttr + '>' + cells + actionsCell + '</tr>';
  }).join('');
  const pager = '<div class="pager"><span>Showing ' + ((page - 1) * perPage + 1) + '–' + Math.min(page * perPage, total) + ' of ' + total + '</span><div class="pager-btns">'
    + '<button class="btn-icon" data-action="page-table" data-table="' + key + '" data-dir="prev" ' + (page <= 1 ? 'disabled' : '') + '>' + ic('arrowLeft') + '</button>'
    + '<span class="pager-page">Page ' + page + ' / ' + totalPages + '</span>'
    + '<button class="btn-icon" data-action="page-table" data-table="' + key + '" data-dir="next" ' + (page >= totalPages ? 'disabled' : '') + '>' + ic('chevRight') + '</button>'
    + '</div></div>';
  return '<div class="table-wrap"><table class="dtable"><thead><tr>' + head + (opts.rowActions ? '<th></th>' : '') + '</tr></thead><tbody>' + body + '</tbody></table></div>' + pager;
}

/* =========================================================================
   MODAL, DRAWER & TOAST
========================================================================= */
let modalGen = 0;
export function openModal(cfg: { title: string; body: string; wide?: boolean; submitLabel?: string; danger?: boolean; onSubmit?: () => void }): void {
  modalGen++;
  const myGen = modalGen;
  state.modalSubmit = cfg.onSubmit || null;
  const root = $('modal-root');
  if (!root) return;
  root.innerHTML = '<div class="overlay" data-action="close-modal"></div>'
    + '<div class="modal ' + (cfg.wide ? 'wide' : '') + '">'
    + '<div class="modal-head"><h3>' + escapeHtml(cfg.title) + '</h3><button class="btn-icon" data-action="close-modal">' + ic('x') + '</button></div>'
    + '<div class="modal-body">' + cfg.body + '</div>'
    + '<div class="modal-foot"><button class="btn btn-ghost" data-action="close-modal">Cancel</button>'
    + (cfg.onSubmit ? '<button class="btn ' + (cfg.danger ? 'btn-danger' : 'btn-primary') + '" data-action="modal-submit">' + (cfg.submitLabel || 'Save') + '</button>' : '')
    + '</div></div>';
  root.classList.remove('open');
  requestAnimationFrame(() => { if (modalGen === myGen) root.classList.add('open'); });
  setTimeout(() => { if (modalGen !== myGen) return; const f = root.querySelector('input,select,textarea') as HTMLElement; if (f) f.focus(); }, 60);
}

export function closeModal(): void {
  const root = $('modal-root');
  if (!root) return;
  const myGen = modalGen;
  root.classList.remove('open');
  state.modalSubmit = null;
  setTimeout(() => { if (modalGen === myGen) root.innerHTML = ''; }, 200);
}

export function submitWithDelay(action: () => Promise<void> | void): void {
  const btn = $q('#modal-root .btn-primary, #modal-root .btn-danger');
  if (btn) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Saving…'; }
  (async () => {
    try {
      await action();
      closeModal();
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'danger');
      if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig || 'Save'; }
    }
  })();
}

let drawerGen = 0;
export function openDrawer(headHtml: string, tabs: { key: string; label: string }[], initialTab: string, renderTab: (tab: string) => string): void {
  drawerGen++;
  const myGen = drawerGen;
  state.drawerTab = initialTab;
  state.drawerRenderTab = renderTab;
  function full() {
    const tabsHtml = tabs.map(t => '<button class="tab ' + (t.key === state.drawerTab ? 'active' : '') + '" data-action="drawer-tab" data-tab="' + t.key + '">' + t.label + '</button>').join('');
    return headHtml + '<div class="tabs">' + tabsHtml + '</div><div class="drawer-body" id="drawer-body">' + renderTab(state.drawerTab) + '</div>';
  }
  const root = $('drawer-root');
  if (!root) return;
  root.innerHTML = '<div class="overlay" data-action="close-drawer"></div><div class="drawer">' + full() + '</div>';
  root.classList.remove('open');
  requestAnimationFrame(() => { if (drawerGen === myGen) root.classList.add('open'); });
}

export function closeDrawer(): void {
  const root = $('drawer-root');
  if (!root) return;
  const myGen = drawerGen;
  root.classList.remove('open');
  setTimeout(() => { if (drawerGen === myGen) { root.innerHTML = ''; state.drawerRenderTab = null; } }, 220);
}

export function showToast(msg: string, type = 'success'): void {
  const root = $('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + (type || 'success');
  el.innerHTML = '<span class="toast-icon">' + ic(type === 'success' ? 'check' : type === 'danger' ? 'alert' : 'info') + '</span><span>' + escapeHtml(msg) + '</span><button class="toast-close">' + ic('x') + '</button>';
  (el.querySelector('.toast-close') as HTMLElement).onclick = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 3800);
}

export function confirmAction(title: string, body: string, confirmLabel: string, onConfirm: () => Promise<void> | void, danger = true): void {
  openModal({
    title, body: '<p style="margin:0 0 4px;">' + body + '</p>', submitLabel: confirmLabel || 'Confirm', danger,
    onSubmit: () => submitWithDelay(onConfirm)
  });
}

export function afterMutation(msg: string, type = 'success'): void {
  saveDB();
  rerenderRoute();
  if (state.drawerRenderTab) {
    const dbEl = $('drawer-body');
    if (dbEl) dbEl.innerHTML = state.drawerRenderTab(state.drawerTab);
  }
  if (msg) showToast(msg, type);
}

/* =========================================================================
   ROUTER & ACTION REGISTRY
========================================================================= */
export const ROUTES: Record<string, (params?: any) => void> = {};
export const ACTIONS: Record<string, (el?: HTMLElement, e?: Event) => void> = {};
export const ROW_MENU_PROVIDERS: Record<string, (id: string) => any[]> = {};

export function registerRoute(name: string, fn: (params?: any) => void): void {
  ROUTES[name] = fn;
}

export function registerAction(name: string, fn: (el?: any, e?: any) => void): void {
  ACTIONS[name] = fn;
}

export function registerActions(actionsObj: Record<string, (el?: any, e?: any) => void>): void {
  Object.assign(ACTIONS, actionsObj);
}

const GLOBAL_ROW_MENU_PROVIDERS: Array<(type: string, id: string) => any[]> = [];

export function registerRowMenuProvider(
  typeOrFn: string | ((type: string, id: string) => any[]),
  maybeFn?: (id: string) => any[]
): void {
  if (typeof typeOrFn === 'function') {
    GLOBAL_ROW_MENU_PROVIDERS.push(typeOrFn);
  } else if (typeof typeOrFn === 'string' && maybeFn) {
    ROW_MENU_PROVIDERS[typeOrFn] = maybeFn;
  }
}

export function rowMenuItems(type: string, id: string): any[] {
  if (ROW_MENU_PROVIDERS[type]) {
    return ROW_MENU_PROVIDERS[type](id);
  }
  for (const provider of GLOBAL_ROW_MENU_PROVIDERS) {
    const res = provider(type, id);
    if (res && res.length) return res;
  }
  return [];
}

export function openRowMenu(btn: HTMLElement, type: string, id: string): void {
  $$('.dropdown-menu').forEach(m => m.remove());
  const items = rowMenuItems(type, id);
  if (!items || !items.length) return;
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  menu.innerHTML = items.map((it, idx) => `<button data-idx="${idx}" class="${it.danger ? 'danger' : ''}">${ic(it.icon)} ${it.label}</button>`).join('');
  document.body.appendChild(menu);
  const rect = btn.getBoundingClientRect();
  menu.style.position = 'fixed'; menu.style.top = (rect.bottom + 4) + 'px'; menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.querySelectorAll('button').forEach((b, idx) => b.onclick = (e) => { e.stopPropagation(); menu.remove(); items[idx].action(); });
  setTimeout(() => document.addEventListener('click', function closeOnce() { menu.remove(); document.removeEventListener('click', closeOnce); }), 0);
}

export const NAV = [
  { group: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: 'grid' }] },
  { group: 'People & vehicles', items: [{ key: 'users', label: 'Users', icon: 'users' }, { key: 'vehicles', label: 'Vehicles', icon: 'car' }] },
  { group: 'Safety network', items: [{ key: 'qr', label: 'QR codes', icon: 'qrcode' }, { key: 'gps', label: 'GPS devices', icon: 'satellite' }, { key: 'sos', label: 'SOS incidents', icon: 'alert', badge: true }] },
  { group: 'Commerce', items: [{ key: 'orders', label: 'Orders', icon: 'box' }, { key: 'inventory', label: 'Inventory', icon: 'archive' }, { key: 'membership', label: 'Membership', icon: 'award' }] },
  { group: 'Support & intelligence', items: [{ key: 'support', label: 'Support desk', icon: 'headset' }, { key: 'ai', label: 'AI console', icon: 'cpu' }, { key: 'crm', label: 'CRM activity', icon: 'phone' }] },
  { group: 'Platform', items: [{ key: 'content', label: 'Content & campaigns', icon: 'image' }, { key: 'reports', label: 'Reports', icon: 'chart' }, { key: 'roles', label: 'Roles & permissions', icon: 'shield' }, { key: 'audit-logs', label: 'Audit Logs', icon: 'book' }] },
];

export const NAV_TITLES: Record<string, string> = {};
NAV.forEach(g => g.items.forEach(i => NAV_TITLES[i.key] = i.label));

export function renderNav(): void {
  const activeCount = (DB.sosEvents || []).filter((s: any) => s.status === 'pending' || s.status === 'escalated').length;
  const html = NAV.map(g => {
    const items = g.items.map(i => {
      const badgeHtml = (i.badge && activeCount > 0) ? '<span class="nav-badge">' + activeCount + '</span>' : '';
      return '<a class="nav-item" data-route="' + i.key + '" href="#/' + i.key + '">' + ic(i.icon) + '<span>' + i.label + '</span>' + badgeHtml + '</a>';
    }).join('');
    return '<div class="nav-group"><div class="nav-group-label">' + g.group + '</div>' + items + '</div>';
  }).join('');
  const navEl = $('nav');
  if (navEl) navEl.innerHTML = html;
}

export function setActiveNav(routeName: string): void {
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.route === routeName));
}

export function rerenderRoute(): void {
  const r = ROUTES[state.route.name];
  if (r) {
    r(state.route.params);
    mountAnimations();
  }
}

export function navigate(routeName: string, params: any[] = []): void {
  if (typeof window !== 'undefined') {
    window.location.hash = '#/' + routeName + (params.length ? '/' + params.join('/') : '');
  }
}
