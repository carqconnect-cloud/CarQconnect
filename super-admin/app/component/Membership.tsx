'use client';

import React, { useEffect } from 'react';
import {
  $,
  $$,
  ic,
  escapeHtml,
  fmtDate,
  fmtINR,
  statusBadge,
  badge,
  renderEmpty,
  renderSkeletonTable,
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
} from '../../lib/adminShared';

export const membershipTabs = [
  { key: 'plans', label: 'Plans' },
  { key: 'subs', label: 'Subscriptions' },
  { key: 'renewals', label: 'Renewals & expiry' },
];

/* =========================================================================
   ENTITY MAPPERS
========================================================================= */
export function mapPlanFromApi(p: any) {
  if (!p) return null;
  const rawFeatures = Array.isArray(p.features) ? p.features : [];
  const features = rawFeatures.map((f: any) => {
    if (typeof f === 'string') return { title: f, isIncluded: true };
    return { title: f.title || '', isIncluded: f.isIncluded !== false };
  });

  return {
    id: p.id,
    name: p.name || 'Unnamed Plan',
    price: Number(p.price) || 0,
    badge: p.badge || null,
    description: p.description || '',
    features,
    totalSubscribers: p.totalSubscribers ?? 0,
    activeSubscribers: p.activeSubscribers ?? 0,
    raw: p,
  };
}

export function mapSubscriptionFromApi(s: any) {
  if (!s) return null;
  const userName =
    s.userName ||
    (s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : null) ||
    s.userEmail ||
    'Customer';

  return {
    id: s.id,
    userId: s.userId,
    userName,
    userEmail: s.userEmail || s.user?.email || '—',
    userPhone: s.userPhone || s.user?.phone || '—',
    planId: s.planId,
    planName: s.planName || s.plan?.name || 'Subscription Plan',
    planPrice: Number(s.planPrice ?? s.plan?.price ?? 0),
    badge: s.badge || s.plan?.badge || null,
    startDate: s.startDate || s.startedAt,
    startedAt: new Date(s.startDate || s.startedAt || Date.now()).getTime(),
    endDate: s.endDate || s.expiresAt,
    expiresAt: s.endDate || s.expiresAt ? new Date(s.endDate || s.expiresAt).getTime() : null,
    status: s.status || 'ACTIVE',
    isExpired: Boolean(s.isExpired),
    raw: s,
  };
}

/* =========================================================================
   SERVER SYNCHRONIZERS
========================================================================= */
export async function syncPlans() {
  const res: any = await apiClient.get('/admin/memberships/plans');
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.plans = rawItems.map(mapPlanFromApi).filter(Boolean);
  return DB.plans;
}

export async function syncSubscriptions(query: any = {}) {
  const res: any = await apiClient.get('/admin/memberships/subscriptions', { page: 1, limit: 100, ...query });
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.subscriptions = rawItems.map(mapSubscriptionFromApi).filter(Boolean);
  return DB.subscriptions;
}

/* =========================================================================
   PLAN MODAL
========================================================================= */
export function openPlanModal(existing?: any) {
  const isEdit = !!existing;
  const defaultFeatures = [
    'Vehicle Profile (1 Car)',
    'Basic Reminders',
    'Document Storage (5 files)',
    'Emergency Contacts (2)',
    'Standard Support',
  ];

  const featuresText = isEdit
    ? (existing.features || [])
        .map((f: any) => (f.isIncluded ? f.title : `- ${f.title}`))
        .join('\n')
    : defaultFeatures.join('\n');

  openModal({
    title: isEdit ? 'Edit Plan' : 'Create New Plan',
    submitLabel: isEdit ? 'Save Changes' : 'Create Plan',
    wide: true,
    body: `<div class="form-grid">
      <div class="field">
        <label>Plan Name <span class="text-danger">*</span></label>
        <input id="f-plname" placeholder="e.g. Free, Basic, Premium, Gold" value="${isEdit ? escapeHtml(existing.name) : ''}">
      </div>
      <div class="field">
        <label>Price (₹ / month) <span class="text-danger">*</span></label>
        <input id="f-plprice" type="number" step="1" min="0" placeholder="0 for Free" value="${isEdit ? existing.price : ''}">
      </div>
      <div class="field full">
        <label>Badge / Tag (Optional)</label>
        <input id="f-plbadge" placeholder="e.g. ALL-ACCESS, POPULAR, RECOMMENDED" value="${isEdit && existing.badge ? escapeHtml(existing.badge) : ''}">
      </div>
      <div class="field full">
        <label>Description</label>
        <input id="f-pldesc" placeholder="Short description of who this plan is for" value="${isEdit ? escapeHtml(existing.description || '') : ''}">
      </div>
      <div class="field full">
        <label>Features & Benefits (one per line)</label>
        <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:6px;">
          Tip: Prefix line with <code>-</code> to mark as not included (e.g. <code>- Priority Support</code>).
        </div>
        <textarea id="f-plfeatures" rows="6" style="min-height:120px; font-family:monospace; font-size:12.5px;">${escapeHtml(featuresText)}</textarea>
      </div>
    </div>`,
    onSubmit: async () => {
      const name = ($('f-plname') as HTMLInputElement).value.trim();
      if (!name) {
        showToast('Plan name is required.', 'danger');
        return;
      }

      const priceVal = ($('f-plprice') as HTMLInputElement).value.trim();
      const price = priceVal === '' ? 0 : Math.max(0, parseFloat(priceVal) || 0);

      const badgeVal = ($('f-plbadge') as HTMLInputElement).value.trim();
      const badge = badgeVal || null;

      const description = ($('f-pldesc') as HTMLInputElement).value.trim();

      const rawFeaturesText = ($('f-plfeatures') as HTMLTextAreaElement).value;
      const features = rawFeaturesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => {
          const isExcluded = /^[-x]\s*/i.test(line);
          const title = line.replace(/^[-x]\s*/i, '').trim();
          return { title, isIncluded: !isExcluded };
        });

      try {
        if (isEdit) {
          await apiClient.put(`/admin/memberships/plans/${existing.id}`, {
            name,
            price,
            badge,
            description,
            features,
          });
          await syncPlans();
          closeModal();
          afterMutation('Plan updated successfully.');
          renderMembershipTab('plans');
        } else {
          await apiClient.post('/admin/memberships/plans', {
            name,
            price,
            badge,
            description,
            features,
          });
          await syncPlans();
          closeModal();
          afterMutation('New plan created successfully.');
          renderMembershipTab('plans');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to save plan', 'danger');
      }
    },
  });
}

/* =========================================================================
   TABS & ROUTE VIEW RENDERER
========================================================================= */
export async function renderMembershipTab(tab: string) {
  const body = $('mem-body');
  if (!body) return;

  if (tab === 'plans') {
    try {
      body.innerHTML = `<div class="p-8 text-center muted"><span class="spinner"></span> Loading plans…</div>`;
      await syncPlans();
      if (!DB.plans || DB.plans.length === 0) {
        body.innerHTML = renderEmpty('No plans created yet', 'Click "+ Create plan" to add your first membership plan.', 'award');
        return;
      }

      body.innerHTML = `
        <div class="plans-scroll-wrap">
          <div class="plans-carousel grid grid-3">
            ${DB.plans
              .map(
                (p: any) => `
              <div class="card plan-card" style="display:flex; flex-direction:column; justify-content:space-between; position:relative; min-height:340px;">
                <div>
                  <div class="hstack" style="justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                      <div class="card-title" style="font-size:18px; margin-bottom:4px;">${escapeHtml(p.name)}</div>
                      ${p.badge ? `<span class="badge badge-primary" style="font-size:11px; font-weight:700;">${escapeHtml(p.badge)}</span>` : ''}
                    </div>
                    <span class="chip" style="font-size:11px; font-weight:600;">${p.activeSubscribers || 0} active</span>
                  </div>
                  <div style="font-family:var(--font-display);font-size:26px;font-weight:800;margin:10px 0 6px;">
                    ${p.price === 0 ? 'Free' : fmtINR(p.price)}
                    <span class="faint" style="font-size:13px;font-weight:500;"> / month</span>
                  </div>
                  <p class="muted" style="font-size:12.5px; line-height:1.4; margin-bottom:14px; min-height:34px;">
                    ${escapeHtml(p.description || 'Essential connected vehicle telemetry and benefits.')}
                  </p>
                  <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:8px;">Features Included</div>
                  <ul style="margin:0 0 16px; padding:0; list-style:none; font-size:12.5px; display:flex; flex-direction:column; gap:8px;">
                    ${(p.features || [])
                      .map(
                        (f: any) => `
                      <li style="display:flex; align-items:center; gap:8px; color:${f.isIncluded ? 'var(--text-main)' : 'var(--text-muted)'}; opacity:${f.isIncluded ? '1' : '0.5'};">
                        <span style="color:${f.isIncluded ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)'}; font-weight:bold; font-size:13px; flex-shrink:0;">${f.isIncluded ? '✓' : '✕'}</span>
                        <span style="line-height:1.35;">${escapeHtml(f.title)}</span>
                      </li>`,
                      )
                      .join('')}
                  </ul>
                </div>
                <div class="hstack" style="gap:8px; border-top:1px solid var(--border); padding-top:12px; margin-top:12px;">
                  <button class="btn btn-sm" style="flex:1;" data-action="open-edit-plan" data-id="${p.id}">${ic('pencil')} Edit plan</button>
                  ${(p.totalSubscribers || 0) === 0 ? `<button class="btn btn-sm btn-ghost" data-action="delete-plan" data-id="${p.id}" title="Delete plan" style="color:var(--danger);">${ic('trash')}</button>` : ''}
                </div>
              </div>`,
              )
              .join('')}
          </div>
          <div class="carousel-hint mobile-only" style="display:none; text-align:center; font-size:11px; color:var(--text-muted); margin-top:10px; align-items:center; justify-content:center; gap:6px;">
            ${ic('chevron-left')} <span>Swipe to view all plans (${DB.plans.length})</span> ${ic('chevron-right')}
          </div>
        </div>`;
    } catch (err: any) {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load plans</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-membership">Retry</button></div>`;
    }
  } else if (tab === 'subs') {
    const st = tableState('subs');
    const cols = [
      {
        key: 'userName',
        label: 'User / Customer',
        sortable: true,
        render: (r: any) => `<div><div style="font-weight:600;font-size:13px;">${escapeHtml(r.userName)}</div><div class="cell-sub">${escapeHtml(r.userEmail || '')}</div></div>`,
      },
      {
        key: 'userPhone',
        label: 'Phone',
        sortable: true,
        render: (r: any) => escapeHtml(r.userPhone || '—'),
      },
      {
        key: 'planName',
        label: 'Plan',
        sortable: true,
        render: (r: any) => `<div class="hstack" style="gap:6px;"><strong>${escapeHtml(r.planName)}</strong>${r.badge ? badge(r.badge, 'primary') : ''}</div>`,
      },
      {
        key: 'planPrice',
        label: 'Price',
        sortable: true,
        render: (r: any) => (r.planPrice === 0 ? 'Free' : fmtINR(r.planPrice)),
      },
      {
        key: 'startedAt',
        label: 'Started',
        sortable: true,
        render: (r: any) => fmtDate(r.startedAt),
      },
      {
        key: 'expiresAt',
        label: 'Expires',
        sortable: true,
        render: (r: any) => (r.expiresAt ? fmtDate(r.expiresAt) : badge('No expiry / Active', 'success')),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (r: any) => statusBadge(r.status),
      },
    ];

    const hasCachedSubs = Array.isArray(DB.subscriptions) && DB.subscriptions.length > 0;
    body.innerHTML = `<div class="toolbar"><div class="toolbar-search">${ic('search')}<input placeholder="Search user, plan…" data-table-search="subs" value="${escapeHtml(st.search)}"></div><div class="spacer"></div><span class="chip" id="subs-count-chip">${ic('award')} ${(DB.subscriptions || []).length} subscriptions</span></div><div id="tbl-subs">${hasCachedSubs ? '' : renderSkeletonTable(6, 6)}</div>`;

    const renderSubsData = () => {
      const chip = $('subs-count-chip');
      if (chip) chip.innerHTML = `${ic('award')} ${(DB.subscriptions || []).length} subscriptions`;
      registerTable('subs', () =>
        buildTable('subs', cols, DB.subscriptions || [], { perPage: 10, emptyTitle: 'No subscriptions found', emptyBody: 'No users have subscribed to any plan yet.' }),
      );
      refreshTable('subs');
    };

    if (hasCachedSubs) {
      renderSubsData();
    }

    syncSubscriptions()
      .then(() => {
        renderSubsData();
      })
      .catch((err) => {
        if (!hasCachedSubs) {
          const tbl = $('tbl-subs');
          if (tbl) {
            tbl.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load subscriptions</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p></div>`;
          }
        }
      });
  } else if (tab === 'renewals') {
    try {
      body.innerHTML = `<div class="p-8 text-center muted"><span class="spinner"></span> Loading renewals…</div>`;
      const renewalsRes: any = await apiClient.get('/admin/memberships/renewals', { days: 30 });
      const soon = Array.isArray(renewalsRes) ? renewalsRes : renewalsRes?.items || renewalsRes?.renewals || renewalsRes?.data || [];

      body.innerHTML = `<div class="card"><div class="card-title" style="margin-bottom:14px;">Expiring within 30 days</div>
      ${soon.length ? `<div class="list-simple">${soon.map((s: any) => {
        const daysRemaining = s.daysRemaining ?? 0;
        let urgencyBadge = badge(`Expires in ${daysRemaining}d`, 'info');
        if (s.isExpired || daysRemaining <= 0) {
          urgencyBadge = badge('Expired', 'danger');
        } else if (daysRemaining <= 5) {
          urgencyBadge = badge(`Expires in ${daysRemaining}d`, 'warning');
        }

        return `<div class="list-simple-row" style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
        <div>
          <div class="hstack" style="gap:8px;">
            <span style="font-weight:600;font-size:13.5px;">${escapeHtml(s.userName)}</span>
            ${urgencyBadge}
          </div>
          <div class="cell-sub" style="margin-top:2px;">
            ${escapeHtml(s.planName)} · ${s.userEmail || s.userPhone || ''} · ${s.endDate ? `expires ${fmtDate(new Date(s.endDate).getTime())}` : 'No date'}
          </div>
        </div>
        <button class="btn btn-sm btn-primary" data-action="send-reminder" data-id="${s.id}">${ic('bell')} Send reminder</button>
      </div>`;
      }).join('')}</div>` : renderEmpty('Nothing expiring soon', 'No active memberships are due for renewal in the next 30 days.', 'award')}
    </div>`;
    } catch (err: any) {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load renewals</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p></div>`;
    }
  }
}

export function renderMembershipView(params?: any[]) {
  const tab = params && params[0] ? params[0] : 'plans';
  const viewEl = $('view');
  if (!viewEl) return;

  viewEl.innerHTML = `
    <div class="page-head"><div><h1>Membership</h1><p>Plans, benefits, entitlements and the subscription lifecycle across all users.</p></div>
      ${tab === 'plans' ? `<div class="page-head-actions"><button class="btn btn-primary" data-action="open-add-plan">${ic('plus')} Create plan</button></div>` : ''}
    </div>
    <div class="tabs">${membershipTabs.map((t) => `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="membership" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
    <div id="mem-body"><div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading membership data…</div></div>
  `;
  renderMembershipTab(tab);
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export async function sendReminder(id: string) {
  if (!id) {
    showToast('Subscription ID is required to send reminder.', 'danger');
    return;
  }
  try {
    const res: any = await apiClient.post(`/admin/memberships/subscriptions/${encodeURIComponent(id)}/remind`, {});
    afterMutation(res?.message || 'Renewal reminder sent successfully.');
  } catch (err: any) {
    showToast('Failed to record reminder: ' + (err.message || 'Server error'), 'danger');
  }
}

export function registerMembershipSection() {
  registerRoute('membership', renderMembershipView);

  registerActions({
    'open-add-plan': () => openPlanModal(),
    'open-edit-plan': (el: HTMLElement) => {
      const p = (DB.plans || []).find((x: any) => x.id === el.dataset.id);
      if (p) openPlanModal(p);
    },
    'delete-plan': async (el: HTMLElement) => {
      const planId = el.dataset.id;
      if (!planId) return;
      if (!confirm('Are you sure you want to delete this subscription plan?')) return;
      try {
        await apiClient.delete(`/admin/memberships/plans/${planId}`);
        await syncPlans();
        afterMutation('Plan deleted successfully.');
        renderMembershipTab('plans');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete plan', 'danger');
      }
    },
    'send-reminder': (el: any) => {
      if (el?.dataset?.id) {
        sendReminder(el.dataset.id);
      } else {
        showToast('Renewal reminder sent.');
      }
    },
    'retry-membership': () => {
      renderMembershipView();
    },
  });
}

// Auto-register upon import
registerMembershipSection();

export default function Membership() {
  useEffect(() => {
    renderMembershipView();
  }, []);

  return <div id="membership-component-root" />;
}
