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
  escapeHtml,
  apiClient,
  DB,
  tableState,
  registerTable,
  refreshTable,
  buildTable,
  openModal,
  closeModal,
  confirmAction,
  showToast,
  afterMutation,
  submitWithDelay,
  registerRoute,
  registerActions,
  registerRowMenuProvider,
} from '../../lib/adminShared';
import { syncAiKnowledge, openKbModal } from './AiConsole';

export function mapBannerFromApi(b: any) {
  if (!b) return null;
  return {
    id: b.id,
    title: b.title,
    schedule: b.schedule || 'Not scheduled',
    status: (b.status || 'draft').toLowerCase(),
    targetUrl: b.targetUrl || null,
    imageUrl: b.imageUrl || null,
    priority: b.priority ?? 0,
    createdAt: b.createdAt ? new Date(b.createdAt).getTime() : Date.now(),
    updatedAt: b.updatedAt ? new Date(b.updatedAt).getTime() : Date.now(),
    raw: b,
  };
}

export function mapCampaignFromApi(c: any) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    channel: c.channel,
    audience: c.audience,
    message: c.message || '',
    status: c.status || 'Draft',
    sendAt: c.sentAt ? new Date(c.sentAt).getTime() : c.scheduledAt ? new Date(c.scheduledAt).getTime() : null,
    targetCount: c.targetCount ?? 0,
    isSimulated: Boolean(c.isSimulated),
    createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
    updatedAt: c.updatedAt ? new Date(c.updatedAt).getTime() : Date.now(),
    raw: c,
  };
}

export async function syncBanners(query: any = {}) {
  try {
    const res: any = await apiClient.get('/admin/banners', { page: 1, limit: 100, ...query });
    const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
    DB.banners = rawItems.map(mapBannerFromApi).filter(Boolean);
    return DB.banners;
  } catch (_err) {
    return DB.banners;
  }
}

export async function syncCampaigns(query: any = {}) {
  try {
    const res: any = await apiClient.get('/admin/campaigns', { page: 1, limit: 100, ...query });
    const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
    DB.campaigns = rawItems.map(mapCampaignFromApi).filter(Boolean);
    return DB.campaigns;
  } catch (_err) {
    return DB.campaigns;
  }
}

export function openBannerModal() {
  openModal({
    title: 'Add banner',
    submitLabel: 'Add banner',
    body: `<div class="form-grid single">
    <div class="field"><label>Banner title</label><input id="f-ban-title" placeholder="e.g. Festive hardware bundle offer"></div>
    <div class="field"><label>Schedule</label><input id="f-ban-sched" placeholder="e.g. 01 Oct – 15 Oct 2026"></div>
    <div class="field"><label>Target URL (optional)</label><input id="f-ban-url" placeholder="e.g. /membership/renew or https://fioner.in/offers"></div>
  </div>`,
    onSubmit: () => submitWithDelay(async () => {
      const title = ($('f-ban-title') as HTMLInputElement)?.value.trim() || 'Untitled banner';
      const schedule = ($('f-ban-sched') as HTMLInputElement)?.value.trim() || 'Not scheduled';
      const targetUrl = ($('f-ban-url') as HTMLInputElement)?.value.trim() || null;
      try {
        const created: any = await apiClient.post('/admin/banners', {
          title,
          schedule,
          status: 'draft',
          targetUrl,
        });
        DB.banners.unshift(mapBannerFromApi(created));
        closeModal();
        afterMutation('Banner added as draft.');
        renderContentTab('banners');
      } catch (err: any) {
        showToast(err.message || 'Failed to create banner', 'danger');
      }
    })
  });
}

export function openCampaignModal() {
  openModal({
    title: 'Create campaign',
    submitLabel: 'Create',
    wide: true,
    body: `<div class="form-grid">
    <div class="field full"><label>Campaign name</label><input id="f-cmp-name" placeholder="e.g. Membership renewal reminder"></div>
    <div class="field"><label>Channel</label><select id="f-cmp-channel"><option>SMS</option><option>Push</option><option>Email</option><option>SMS + Push</option><option>Email + Push</option><option>In-app</option></select></div>
    <div class="field"><label>Audience</label><select id="f-cmp-audience"><option>All active users</option><option>Expiring in 15 days</option><option>Balance &lt; ₹100</option><option>Users without emergency contact</option></select></div>
    <div class="field full">
      <div id="f-cmp-audience-preview" style="padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-size:12.5px;display:flex;align-items:center;gap:8px;">
        <span class="spinner" style="width:12px;height:12px;"></span> Estimating audience reach…
      </div>
    </div>
    <div class="field full"><label>Message content (optional)</label><textarea id="f-cmp-msg" rows="3" placeholder="Notification message text…"></textarea></div>
  </div>`,
    onSubmit: () => submitWithDelay(async () => {
      const name = ($('f-cmp-name') as HTMLInputElement)?.value.trim() || 'Untitled campaign';
      const channel = ($('f-cmp-channel') as HTMLSelectElement)?.value;
      const audience = ($('f-cmp-audience') as HTMLSelectElement)?.value;
      const message = ($('f-cmp-msg') as HTMLTextAreaElement)?.value.trim() || null;
      try {
        const created: any = await apiClient.post('/admin/campaigns', {
          name,
          channel,
          audience,
          message,
          status: 'Draft',
        });
        DB.campaigns.unshift(mapCampaignFromApi(created));
        closeModal();
        afterMutation('Campaign created as draft.');
        renderContentTab('campaigns');
      } catch (err: any) {
        showToast(err.message || 'Failed to create campaign', 'danger');
      }
    })
  });

  const audSelect = $('f-cmp-audience') as HTMLSelectElement;
  const previewBox = $('f-cmp-audience-preview');
  const loadPreview = async () => {
    if (!audSelect || !previewBox) return;
    previewBox.innerHTML = '<span class="spinner" style="width:12px;height:12px;"></span> Estimating reach…';
    try {
      const prev: any = await apiClient.get('/admin/campaigns/audience-preview', { audience: audSelect.value });
      previewBox.innerHTML = `<div><strong style="color:var(--success);font-size:13px;">${(prev?.count ?? 0).toLocaleString()} recipients</strong> <span class="muted" style="margin-left:6px;">· ${escapeHtml(prev?.description || '')}</span></div>`;
    } catch {
      previewBox.innerHTML = '<span class="muted">Audience preview unavailable</span>';
    }
  };

  if (audSelect) {
    audSelect.addEventListener('change', loadPreview);
    loadPreview();
  }
}

export async function toggleBanner(id: string) {
  const b = DB.banners.find((x: any) => x.id === id);
  if (!b) return;
  try {
    const updated: any = await apiClient.patch(`/admin/banners/${encodeURIComponent(id)}/status`);
    b.status = updated.status;
    afterMutation('Banner status updated.');
    renderContentTab('banners');
  } catch (err: any) {
    showToast(err.message || 'Failed to update banner', 'danger');
  }
}

export function deleteBanner(id: string) {
  confirmAction('Delete banner', 'Are you sure you want to delete this banner?', 'Delete', async () => {
    try {
      await apiClient.delete(`/admin/banners/${encodeURIComponent(id)}`);
      DB.banners = DB.banners.filter((x: any) => x.id !== id);
      afterMutation('Banner removed.', 'danger');
      renderContentTab('banners');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete banner', 'danger');
    }
  }, true);
}

export function mapCouponFromApi(c: any) {
  if (!c) return null;
  return {
    id: c.id,
    code: (c.code || '').toUpperCase(),
    title: c.title || c.description || 'Promotional Coupon',
    discountType: c.discountType || 'PERCENT',
    discountValue: Number(c.discountValue || c.discount || 10),
    minOrder: Number(c.minOrder || c.minAmount || 0),
    schedule: c.schedule || 'Ongoing',
    status: (c.status || 'active').toLowerCase(),
    usedCount: Number(c.usedCount || 0),
    usageLimit: Number(c.usageLimit || 100),
    createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
    raw: c,
  };
}

export const COUPONS_STORAGE_KEY = 'fioner_admin_coupons_cache';
export const CONTENT_TAB_STORAGE_KEY = 'fioner_admin_content_tab';

export function getCachedCoupons(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COUPONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function saveCachedCoupons(coupons: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons || []));
  } catch (_e) {}
}

export async function syncCoupons(query: any = {}) {
  // 1. Immediately hydrate from localStorage cache so coupons are NEVER wiped on refresh
  const cached = getCachedCoupons();
  if (cached.length > 0 && (!DB.coupons || DB.coupons.length === 0)) {
    DB.coupons = cached;
  }

  // 2. Fetch from backend with public /coupons route (seamless cross-origin auth)
  try {
    let res: any;
    try {
      res = await apiClient.get('/coupons', { page: 1, limit: 100, ...query });
    } catch (_e) {
      res = await apiClient.get('/admin/coupons', { page: 1, limit: 100, ...query });
    }
    const rawItems = res?.items || res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const serverCoupons = rawItems.map(mapCouponFromApi).filter(Boolean);
      // Merge server coupons with any local cached coupons by code
      const map = new Map<string, any>();
      for (const sc of serverCoupons) {
        map.set(sc.code.toUpperCase(), sc);
      }
      for (const cc of cached) {
        if (!map.has(cc.code.toUpperCase())) {
          map.set(cc.code.toUpperCase(), cc);
        }
      }
      DB.coupons = Array.from(map.values());
      saveCachedCoupons(DB.coupons);
    } else if (cached.length > 0) {
      DB.coupons = cached;
    }
    return DB.coupons;
  } catch (_err) {
    if (!DB.coupons || DB.coupons.length === 0) {
      DB.coupons = getCachedCoupons();
    }
    return DB.coupons;
  }
}

export function openCouponModal() {
  openModal({
    title: 'Add coupon',
    submitLabel: 'Create coupon',
    wide: true,
    body: `
      <div class="form-grid">
        <div class="field">
          <label>Coupon Code *</label>
          <input id="f-cpn-code" placeholder="e.g. FESTIVE20" style="text-transform:uppercase;font-family:monospace;font-weight:700;" required />
        </div>
        <div class="field">
          <label>Coupon Title / Description *</label>
          <input id="f-cpn-title" placeholder="e.g. Festive season 20% discount on all orders" required />
        </div>
        <div class="field">
          <label>Discount Type</label>
          <select id="f-cpn-type">
            <option value="PERCENT">Percentage (%) Off</option>
            <option value="FLAT">Flat Amount (₹) Off</option>
          </select>
        </div>
        <div class="field">
          <label>Discount Value *</label>
          <input id="f-cpn-value" type="number" placeholder="e.g. 20 (for 20%) or 100 (for ₹100)" min="1" required />
        </div>
        <div class="field">
          <label>Minimum Order Amount (₹)</label>
          <input id="f-cpn-min" type="number" placeholder="e.g. 499 (0 for no minimum)" defaultValue="0" />
        </div>
        <div class="field">
          <label>Usage Limit (Total redemptions)</label>
          <input id="f-cpn-limit" type="number" placeholder="e.g. 500" defaultValue="500" />
        </div>
        <div class="field full">
          <label>Schedule / Validity</label>
          <input id="f-cpn-schedule" placeholder="e.g. 01 Nov – 30 Nov 2026 or Ongoing" />
        </div>
      </div>
    `,
    onSubmit: () =>
      submitWithDelay(async () => {
        const code = ($('f-cpn-code') as HTMLInputElement)?.value.trim().toUpperCase() || 'PROMO10';
        const title = ($('f-cpn-title') as HTMLInputElement)?.value.trim() || 'Special Promo Offer';
        const discountType = ($('f-cpn-type') as HTMLSelectElement)?.value || 'PERCENT';
        const discountValue = Number(($('f-cpn-value') as HTMLInputElement)?.value) || 10;
        const minOrder = Number(($('f-cpn-min') as HTMLInputElement)?.value) || 0;
        const usageLimit = Number(($('f-cpn-limit') as HTMLInputElement)?.value) || 100;
        const schedule = ($('f-cpn-schedule') as HTMLInputElement)?.value.trim() || 'Ongoing';

        const newCoupon = {
          id: 'cpn_' + Date.now().toString(36),
          code,
          title,
          discountType,
          discountValue,
          minOrder,
          usageLimit,
          usedCount: 0,
          schedule,
          status: 'active',
          createdAt: Date.now(),
        };

        // 1. Persist to backend and PostgreSQL DB via Prisma
        let savedFromServer: any = null;
        try {
          savedFromServer = await apiClient.post('/coupons', newCoupon);
        } catch (_e) {
          try {
            savedFromServer = await apiClient.post('/admin/coupons', newCoupon);
          } catch (_e2) {}
        }

        const couponToStore = savedFromServer
          ? mapCouponFromApi(savedFromServer) || newCoupon
          : newCoupon;

        if (!DB.coupons) DB.coupons = [];
        const existingIdx = DB.coupons.findIndex((c: any) => c.code.toUpperCase() === code);
        if (existingIdx >= 0) {
          DB.coupons[existingIdx] = { ...DB.coupons[existingIdx], ...couponToStore };
        } else {
          DB.coupons.unshift(couponToStore);
        }

        // 2. Persist to cache so it is immediately available and preserved across refreshes
        saveCachedCoupons(DB.coupons);

        closeModal();
        afterMutation(`Coupon '${code}' saved in DB successfully.`);
        renderContentTab('coupons');
      }),
  });
}

export async function toggleCoupon(id: string) {
  const c = DB.coupons?.find((x: any) => x.id === id);
  if (!c) return;
  const newStatus = c.status === 'active' ? 'paused' : 'active';
  c.status = newStatus;
  saveCachedCoupons(DB.coupons);

  try {
    await apiClient.patch(`/coupons/${encodeURIComponent(id)}/status`, { status: newStatus });
  } catch (_e) {
    try {
      await apiClient.patch(`/admin/coupons/${encodeURIComponent(id)}/status`, { status: newStatus });
    } catch (_e2) {}
  }
  afterMutation(`Coupon status changed to ${newStatus}.`);
  renderContentTab('coupons');
}

export function deleteCoupon(id: string) {
  confirmAction(
    'Delete coupon',
    'Are you sure you want to delete this coupon? Users will no longer be able to redeem it at checkout.',
    'Delete',
    async () => {
      if (DB.coupons) {
        DB.coupons = DB.coupons.filter((x: any) => x.id !== id);
        saveCachedCoupons(DB.coupons);
      }
      try {
        await apiClient.delete(`/coupons/${encodeURIComponent(id)}`);
      } catch (_e) {
        try {
          await apiClient.delete(`/admin/coupons/${encodeURIComponent(id)}`);
        } catch (_e2) {}
      }
      afterMutation('Coupon deleted.', 'danger');
      renderContentTab('coupons');
    },
    true,
  );
}

export const contentTabs = [
  { key: 'banners', label: 'Banners' },
  { key: 'coupons', label: 'Coupons' },
  { key: 'faq', label: 'FAQ & help' },
  { key: 'campaigns', label: 'Campaigns' },
];

export function renderContentTab(tab: string) {
  const body = $('content-body');
  if (!body) return;

  if (tab === 'banners') {
    body.innerHTML = DB.banners.length ? `<div class="list-simple">${DB.banners.map((b: any) => `<div class="list-simple-row">
    <div><div style="font-weight:600;font-size:13px;">${escapeHtml(b.title)}</div><div class="cell-sub">${escapeHtml(b.schedule)}${b.targetUrl ? ` · <a href="${escapeHtml(b.targetUrl)}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">${escapeHtml(b.targetUrl)}</a>` : ''}</div></div>
    <div class="hstack">${statusBadge(b.status)}<button class="btn-icon" data-action="row-menu" data-menu="banner" data-id="${b.id}">${ic('kebab')}</button></div>
  </div>`).join('')}</div>` : renderEmpty('No banners configured', 'Add promotional banners for website and app placement.', 'award');
  } else if (tab === 'coupons') {
    if (!DB.coupons || DB.coupons.length === 0) {
      const cached = getCachedCoupons();
      if (cached.length > 0) DB.coupons = cached;
    }
    const coupons = DB.coupons || [];
    body.innerHTML = coupons.length
      ? `<div class="list-simple">
          ${coupons
            .map(
              (c: any) => `
            <div class="list-simple-row" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
              <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:42px;height:42px;border-radius:10px;background:rgba(99,102,241,0.12);border:1px dashed rgba(99,102,241,0.35);color:#6366f1;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  ${ic('tag')}
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="mono" style="font-weight:700;font-size:13.5px;color:var(--primary);letter-spacing:0.5px;background:rgba(99,102,241,0.1);padding:2px 8px;border-radius:4px;border:1px solid rgba(99,102,241,0.2);">${escapeHtml(c.code)}</span>
                    <button class="btn btn-xs btn-ghost" data-action="copy-coupon-code" data-code="${escapeHtml(c.code)}" title="Copy code" style="padding:2px 6px;font-size:11px;cursor:pointer;">
                      ${ic('tag')} Copy
                    </button>
                    <span class="badge ${c.discountType === 'PERCENT' ? 'badge-primary' : 'badge-success'}" style="font-size:11px;font-weight:600;">
                      ${c.discountType === 'PERCENT' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                    </span>
                    <span class="badge" style="font-size:10.5px;font-weight:600;background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.25);">
                      Saved in DB
                    </span>
                  </div>
                  <div style="font-weight:600;font-size:13px;margin-top:4px;">${escapeHtml(c.title)}</div>
                  <div class="cell-sub" style="font-size:12px;margin-top:2px;">
                    ${c.minOrder ? `Min Order: <b>₹${c.minOrder}</b> · ` : ''}Schedule: ${escapeHtml(c.schedule || 'Ongoing')} · Redemptions: <b>${c.usedCount ?? 0}</b>${c.usageLimit ? `/${c.usageLimit}` : ''}
                  </div>
                </div>
              </div>
              <div class="hstack" style="display:flex;align-items:center;gap:10px;">
                ${statusBadge(c.status)}
                <button class="btn-icon" data-action="row-menu" data-menu="coupon" data-id="${c.id}">
                  ${ic('kebab')}
                </button>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>`
      : renderEmpty(
          'No coupons configured',
          'Create discount coupons and promo codes for mobile app and store checkout.',
          'tag',
        );
  } else if (tab === 'faq') {
    body.innerHTML = `<div id="tbl-faq"></div>`;
    const cols = [
      { key: 'question', label: 'Topic', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'status', label: 'Status', sortable: true, render: (r: any) => statusBadge(r.status) },
    ];
    registerTable('faq', () => buildTable('faq', cols, DB.aiKnowledge, { perPage: 9, emptyTitle: 'No FAQ content', emptyBody: 'Add questions to help customers solve common problems.' }));
    refreshTable('faq');
  } else if (tab === 'campaigns') {
    body.innerHTML = DB.campaigns.length ? `<div class="list-simple">${DB.campaigns.map((c: any) => `<div class="list-simple-row">
    <div><div style="font-weight:600;font-size:13px;">${escapeHtml(c.name)}</div><div class="cell-sub">${c.channel} · ${escapeHtml(c.audience)}${c.targetCount ? ` · <span class="muted">${c.targetCount} recipients</span>` : ''}</div></div>
    <div class="hstack">${statusBadge(c.status)}${c.status === 'Draft' ? `<button class="btn btn-sm btn-primary" data-action="send-campaign" data-id="${c.id}">Send now</button>` : ''}</div>
  </div>`).join('')}</div>` : renderEmpty('No campaigns created', 'Create targeted SMS, push or email campaigns for user engagement.', 'mail');
  }
}

export function renderContentRoute(params?: any[]) {
  let tab = params && params[0] ? params[0] : null;

  if (!tab && typeof window !== 'undefined') {
    const hash = (window.location.hash || '').replace(/^#\/?/, '');
    const parts = hash.split('/').filter(Boolean);
    if (parts[0] === 'content' && parts[1]) {
      tab = parts[1];
    } else {
      tab = localStorage.getItem(CONTENT_TAB_STORAGE_KEY) || 'coupons';
    }
  }
  if (!tab) tab = 'coupons';

  // Persist current tab to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONTENT_TAB_STORAGE_KEY, tab);
      if (window.location.hash.startsWith('#/content')) {
        window.location.hash = '#/content/' + tab;
      }
    } catch (_e) {}
  }

  const view = $('view');
  if (!view) return;
  view.innerHTML = `
    <div class="page-head"><div><h1>Content & campaigns</h1><p>CMS banners, discount coupons, help content and outbound notification campaigns.</p></div>
      ${tab === 'campaigns' ? `<div class="page-head-actions"><button class="btn btn-primary" data-action="open-add-campaign">${ic('plus')} Create campaign</button></div>` : tab === 'banners' ? `<div class="page-head-actions"><button class="btn btn-primary" data-action="open-add-banner">${ic('plus')} Add banner</button></div>` : tab === 'coupons' ? `<div class="page-head-actions"><button class="btn btn-primary" data-action="open-add-coupon">${ic('plus')} Add coupon</button></div>` : tab === 'faq' ? `<div class="page-head-actions"><button class="btn btn-primary" data-action="open-add-faq">${ic('plus')} Add FAQ topic</button></div>` : ''}
    </div>
    <div class="tabs">${contentTabs.map(t => `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="content" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
    <div id="content-body"></div>
  `;
  renderContentTab(tab);

  if (tab === 'banners') {
    syncBanners().then(() => { renderContentTab('banners'); });
  } else if (tab === 'coupons') {
    syncCoupons().then(() => { renderContentTab('coupons'); });
  } else if (tab === 'faq') {
    syncAiKnowledge().then(() => { renderContentTab('faq'); });
  } else if (tab === 'campaigns') {
    syncCampaigns().then(() => { renderContentTab('campaigns'); });
  }
}

registerRoute('content', renderContentRoute);

registerActions({
  'open-add-banner': () => openBannerModal(),
  'open-add-coupon': () => openCouponModal(),
  'copy-coupon-code': (el: HTMLElement) => {
    const code = el.dataset.code;
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    showToast(`Coupon code '${code}' copied to clipboard!`, 'info');
  },
  'open-add-campaign': () => openCampaignModal(),
  'open-add-faq': () => openKbModal(null),
  'send-campaign': async (el: any) => {
    const id = el.dataset.id;
    if (!id) return;
    const btn = el.closest('button');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Sending…';
    }
    try {
      const res: any = await apiClient.post(`/admin/campaigns/${encodeURIComponent(id)}/send`);
      const c = DB.campaigns.find((x: any) => x.id === id);
      if (c) {
        c.status = res.status || 'Sent';
        c.sendAt = res.sentAt ? new Date(res.sentAt).getTime() : Date.now();
        c.targetCount = res.targetCount;
        c.isSimulated = res.isSimulated;
      }
      showToast(`Campaign sent (${res.targetCount ?? 0} recipients).`, 'success');
      renderContentTab('campaigns');
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch campaign', 'danger');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Send now';
      }
    }
  },
});

registerRowMenuProvider((type, id) => {
  if (type === 'banner') {
    const b = DB.banners.find((x: any) => x.id === id);
    if (!b) return [];
    return [
      { label: b.status === 'live' ? 'Pause' : 'Publish', icon: 'check', action: () => toggleBanner(id) },
      { label: 'Delete', icon: 'trash', danger: true, action: () => deleteBanner(id) },
    ];
  }
  if (type === 'coupon') {
    const c = DB.coupons?.find((x: any) => x.id === id);
    if (!c) return [];
    return [
      {
        label: c.status === 'active' ? 'Pause Coupon' : 'Activate Coupon',
        icon: 'check',
        action: () => toggleCoupon(id),
      },
      { label: 'Delete Coupon', icon: 'trash', danger: true, action: () => deleteCoupon(id) },
    ];
  }
  return [];
});

export default function ContentCampaigns() {
  React.useEffect(() => {
    let initialTab = 'coupons';
    if (typeof window !== 'undefined') {
      const hash = (window.location.hash || '').replace(/^#\/?/, '');
      const parts = hash.split('/').filter(Boolean);
      if (parts[0] === 'content' && parts[1]) {
        initialTab = parts[1];
      } else {
        initialTab = localStorage.getItem(CONTENT_TAB_STORAGE_KEY) || 'coupons';
      }
    }
    renderContentRoute([initialTab]);
  }, []);

  return (
    <div id="content-root">
      <div id="view"></div>
    </div>
  );
}
