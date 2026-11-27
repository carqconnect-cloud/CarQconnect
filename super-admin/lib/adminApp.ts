'use client';

/**
 * Super Admin Application Orchestrator & Router
 *
 * All sidebar section pages have been modularized into their respective
 * components under `super-admin/app/component/`:
 *   - Dashboard.tsx         (#/dashboard)
 *   - Users.tsx             (#/users)
 *   - Vechile.tsx           (#/vehicles)
 *   - Qrcodes.tsx           (#/qr)
 *   - Gpsdevices.tsx        (#/gps)
 *   - Sos.tsx               (#/sos)
 *   - Orders.tsx            (#/orders)
 *   - Inventory.tsx         (#/inventory)
 *   - Membership.tsx        (#/membership)
 *   - Support.tsx           (#/support)
 *   - AiConsole.tsx         (#/ai)
 *   - CrmActivity.tsx       (#/crm)
 *   - ContentCampaigns.tsx  (#/content)
 *   - Reports.tsx           (#/reports)
 *   - RolesPermissions.tsx  (#/roles)
 *
 * This file bootstraps the application shell, maintains global navigation,
 * handles authorization / modal popovers, and re-exports all mappers
 * and API integration helpers for end-to-end compatibility.
 */

import {
  $,
  $q,
  $$,
  ic,
  escapeHtml,
  initials,
  timeAgo,
  apiClient,
  DB,
  loadDB,
  saveDB,
  resetDB,
  state,
  tableState,
  refreshTable,
  openModal,
  closeModal,
  closeDrawer,
  showToast,
  mountAnimations,
  ROUTES,
  ACTIONS,
  NAV,
  NAV_TITLES,
  renderNav,
  setActiveNav,
  rerenderRoute,
  openRowMenu,
} from './adminShared';
import { initAdminSocket, disconnectAdminSocket, stopEmergencySiren } from './socketClient';

// Import all modularized page components to trigger route, action, and row-menu registration
import {
  Dashboard,
  syncDashboard,
  hydrateDashboard,
  renderDashboardRoute,
  Users,
  mapUserFromApi,
  syncUsers,
  renderUsersRoute,
  openUserDrawer,
  openAddUserModal,
  toggleUserStatus,
  Vechile,
  computeVehicleReminder,
  mapVehicleFromApi,
  syncVehicles,
  renderVehiclesRoute,
  openVehicleDrawer,
  Vehicle,
  Qrcodes,
  mapQrFromApi,
  syncQrCodes,
  renderQrRoute,
  openQrDrawer,
  openBatchQrModal,
  openAssignQrModal,
  openReplaceQrModal,
  suspendQr,
  reactivateQr,
  Gpsdevices,
  mapGpsFromApi,
  syncGpsDevices,
  renderGpsRoute,
  openGpsDrawer,
  openAssignGpsModal,
  unbindGps,
  Sos,
  mapSosFromApi,
  syncSosEvents,
  renderSosRoute,
  openSosDrawer,
  Orders,
  mapOrderFromApi,
  syncOrders,
  renderOrdersRoute,
  openOrderDrawer,
  Inventory,
  mapProductFromApi,
  syncProducts,
  renderInventoryRoute,
  openProductDrawer,
  openProductModal,
  Membership,
  mapPlanFromApi,
  mapSubscriptionFromApi,
  syncPlans,
  syncSubscriptions,
  renderMembershipRoute,
  openPlanModal,
  sendReminder,
  Support,
  mapTicketFromApi,
  fetchTicketsServer,
  syncTickets,
  ticketsServerState,
  renderSupportRoute,
  openTicketDrawer,
  AiConsole,
  mapAiKnowledgeFromApi,
  mapAiIntentFromApi,
  mapAiToolFromApi,
  mapAiEscalationRuleFromApi,
  syncAiKnowledge,
  syncAiIntents,
  syncAiTools,
  syncAiEscalationRules,
  syncAiAnalytics,
  renderAiRoute,
  openKbModal,
  deleteKb,
  openThresholdModal,
  CrmActivity,
  mapCrmCallFromApi,
  mapLeadFromApi,
  syncCrmOverview,
  syncCrmCalls,
  syncCrmLeads,
  fetchCrmCallsServer,
  fetchCrmLeadsServer,
  crmCallsServerState,
  crmLeadsServerState,
  renderCrmRoute,
  ContentCampaigns,
  mapBannerFromApi,
  mapCampaignFromApi,
  syncBanners,
  syncCampaigns,
  renderContentRoute,
  openBannerModal,
  openCampaignModal,
  toggleBanner,
  deleteBanner,
  Reports,
  downloadCsv,
  exportReport,
  renderReportsRoute,
  RolesPermissions,
  mapRoleFromApi,
  syncRoles,
  renderRolesRoute,
  PERM_MODULES,
  AuditLogs,
  mapAuditLogFromApi,
  fetchAuditLogs,
  renderAuditLogsRoute,
  auditLogsServerState,
} from '../app/component';

// Re-export all models, mappers, and helpers for external test suites and backend integration
export {
  computeVehicleReminder,
  mapUserFromApi,
  mapVehicleFromApi,
  mapQrFromApi,
  mapGpsFromApi,
  mapSosFromApi,
  mapOrderFromApi,
  mapProductFromApi,
  mapPlanFromApi,
  mapSubscriptionFromApi,
  mapCrmCallFromApi,
  mapLeadFromApi,
  mapAuditLogFromApi,
  mapRoleFromApi,
  mapAiKnowledgeFromApi,
  mapAiIntentFromApi,
  mapAiToolFromApi,
  mapAiEscalationRuleFromApi,
  mapBannerFromApi,
  mapCampaignFromApi,
  mapTicketFromApi,
  fetchTicketsServer,
  ticketsServerState,
  crmCallsServerState,
  crmLeadsServerState,
  auditLogsServerState,
  downloadCsv,
  exportReport,
  DB,
  apiClient,
};

let __fionerAdminBooted = false;
const THEME_KEY = 'fioner_superadmin_theme';

export function initAdminApp(): () => void {
  if (typeof window === 'undefined' || __fionerAdminBooted) {
    return () => { };
  }
  __fionerAdminBooted = true;

  // Register baseline actions for global UI controls
  ACTIONS['toggle-sidebar'] = () => {
    const sb = $('sidebar');
    const bd = $('sidebar-backdrop');
    if (sb) {
      const willOpen = !sb.classList.contains('open');
      sb.classList.toggle('open', willOpen);
      if (bd) bd.classList.toggle('active', willOpen);
    }
  };
  ACTIONS['close-sidebar'] = () => {
    $('sidebar')?.classList.remove('open');
    $('sidebar-backdrop')?.classList.remove('active');
  };
  ACTIONS['toggle-theme'] = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) { }
    updateThemeIcon();
  };
  ACTIONS['close-modal'] = () => closeModal();
  ACTIONS['modal-submit'] = () => {
    if (state.modalSubmit) state.modalSubmit();
  };
  ACTIONS['close-drawer'] = () => closeDrawer();
  ACTIONS['drawer-tab'] = (el: HTMLElement) => {
    state.drawerTab = el.dataset.tab;
    $$('.drawer .tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.tab === state.drawerTab)
    );
    if (state.drawerRenderTab) {
      const db = $('drawer-body');
      if (db) db.innerHTML = state.drawerRenderTab(state.drawerTab);
    }
  };
  ACTIONS['sort-table'] = (el: HTMLElement) => {
    const key = el.dataset.table!,
      col = el.dataset.col!,
      st = tableState(key);
    if (st.sort && st.sort.key === col) {
      st.sort.dir = st.sort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      st.sort = { key: col, dir: 'asc' };
    }
    refreshTable(key);
  };
  ACTIONS['page-table'] = (el: HTMLElement) => {
    const key = el.dataset.table!;
    const dir = el.dataset.dir;
    if (key === 'calls') {
      if (crmCallsServerState.loading) return;
      const current = crmCallsServerState.page || 1;
      const next = dir === 'next' ? current + 1 : current - 1;
      if (next >= 1 && next <= crmCallsServerState.totalPages) {
        fetchCrmCallsServer(next);
      }
      return;
    }
    if (key === 'leads') {
      if (crmLeadsServerState.loading) return;
      const current = crmLeadsServerState.page || 1;
      const next = dir === 'next' ? current + 1 : current - 1;
      if (next >= 1 && next <= crmLeadsServerState.totalPages) {
        fetchCrmLeadsServer(next);
      }
      return;
    }
    const st = tableState(key);
    st.page = (st.page || 1) + (dir === 'next' ? 1 : -1);
    refreshTable(key);
  };
  ACTIONS['nav-to'] = (el: HTMLElement) => {
    location.hash = '#/' + el.dataset.target;
  };
  ACTIONS['subnav'] = (el: HTMLElement) => {
    location.hash = '#/' + el.dataset.route + '/' + el.dataset.tab;
  };
  ACTIONS['row-menu'] = (el: HTMLElement) => {
    openRowMenu(el, el.dataset.menu!, el.dataset.id!);
  };
  ACTIONS['toggle-switch'] = (el: HTMLElement) => el.classList.toggle('on');
  ACTIONS['refresh-dashboard'] = async (el: HTMLElement) => {
    const btn = el.closest('button');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Refreshing…';
    }
    try {
      await hydrateDashboard(true);
      rerenderRoute();
      showToast('Dashboard refreshed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to refresh dashboard', 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${ic('refresh')} Refresh live data`;
      }
    }
  };
  ACTIONS['toggle-notif'] = () => toggleNotifPanel();
  ACTIONS['toggle-profile'] = () => toggleProfilePanel();

  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'dashboard', params: parts.slice(1) };
  }

  function onHashChange() {
    const r = parseHash();
    if (r.name === 'login' || r.name === 'signup') {
      if (apiClient.getToken()) {
        location.hash = '#/dashboard';
        return;
      }
      return;
    }

    let activeRoute = r;
    if (!ROUTES[activeRoute.name]) activeRoute = { name: 'dashboard', params: [] };
    state.route = activeRoute;
    setActiveNav(activeRoute.name);
    const titleEl = $('page-title');
    if (titleEl) titleEl.textContent = NAV_TITLES[activeRoute.name] || 'Dashboard';
    const viewEl = $('view');
    if (viewEl) viewEl.scrollTop = 0;
    const bar = $('progressbar');
    if (bar) {
      bar.classList.add('on');
      bar.style.width = '70%';
    }
    ROUTES[activeRoute.name](activeRoute.params);
    mountAnimations();
    if (bar) {
      setTimeout(() => {
        bar.style.width = '100%';
        setTimeout(() => {
          bar.classList.remove('on');
          bar.style.width = '0%';
        }, 250);
      }, 120);
    }
    if (window.innerWidth <= 900) {
      const sb = $('sidebar');
      if (sb) sb.classList.remove('open');
      const bd = $('sidebar-backdrop');
      if (bd) bd.classList.remove('active');
    }
  }

  function handleDocumentClick(e: MouseEvent) {
    if (window.innerWidth <= 900) {
      const navItem = (e.target as any)?.closest?.('.nav-item');
      if (navItem) {
        $('sidebar')?.classList.remove('open');
        $('sidebar-backdrop')?.classList.remove('active');
      }
    }
    const el = (e.target as any)?.closest?.('[data-action]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  }

  function handleDocumentInput(e: Event) {
    const el = (e.target as any)?.closest?.('[data-table-search]');
    if (el) {
      clearTimeout(el._t);
      const key = el.dataset.tableSearch;
      if (key === 'tickets') {
        el._t = setTimeout(() => {
          const val = el.value.trim();
          if (val === ticketsServerState.search) return;
          ticketsServerState.search = val;
          ticketsServerState.page = 1;
          fetchTicketsServer();
        }, 250);
        return;
      }
      if (key === 'calls') {
        el._t = setTimeout(() => {
          const val = el.value.trim();
          if (val === crmCallsServerState.search) return;
          crmCallsServerState.search = val;
          crmCallsServerState.page = 1;
          fetchCrmCallsServer();
        }, 250);
        return;
      }
      if (key === 'leads') {
        el._t = setTimeout(() => {
          const val = el.value.trim();
          if (val === crmLeadsServerState.search) return;
          crmLeadsServerState.search = val;
          crmLeadsServerState.page = 1;
          fetchCrmLeadsServer();
        }, 250);
        return;
      }
      el._t = setTimeout(() => {
        tableState(key).search = el.value;
        tableState(key).page = 1;
        refreshTable(key);
      }, 200);
    }
  }

  function handleDocumentChange(e: Event) {
    const el = (e.target as any)?.closest?.('[data-table-filter]');
    if (el) {
      const key = el.dataset.tableFilter,
        fk = el.dataset.filterKey;
      if (key === 'tickets') {
        const val = el.value.trim();
        if (val === ticketsServerState.status) return;
        ticketsServerState.status = val;
        ticketsServerState.page = 1;
        fetchTicketsServer();
        return;
      }
      tableState(key).filters[fk] = el.value;
      tableState(key).page = 1;
      refreshTable(key);
    }
  }

  function handleDocumentKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeModal();
      closeDrawer();
      $$('.dropdown-menu').forEach((m) => m.remove());
    }
    if (e.key === 'Enter') {
      const tableSearch = (e.target as any)?.dataset?.tableSearch;
      if (tableSearch === 'tickets') {
        e.preventDefault();
        const el = e.target as HTMLInputElement;
        clearTimeout((el as any)._t);
        const val = el.value.trim();
        if (val !== ticketsServerState.search) {
          ticketsServerState.search = val;
          ticketsServerState.page = 1;
          fetchTicketsServer();
        }
      } else if (tableSearch === 'calls') {
        e.preventDefault();
        const el = e.target as HTMLInputElement;
        clearTimeout((el as any)._t);
        const val = el.value.trim();
        if (val !== crmCallsServerState.search) {
          crmCallsServerState.search = val;
          crmCallsServerState.page = 1;
          fetchCrmCallsServer();
        }
      } else if (tableSearch === 'leads') {
        e.preventDefault();
        const el = e.target as HTMLInputElement;
        clearTimeout((el as any)._t);
        const val = el.value.trim();
        if (val !== crmLeadsServerState.search) {
          crmLeadsServerState.search = val;
          crmLeadsServerState.page = 1;
          fetchCrmLeadsServer();
        }
      }
    }
  }

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('input', handleDocumentInput);
  document.addEventListener('change', handleDocumentChange);
  document.addEventListener('keydown', handleDocumentKeydown);

  function toggleNotifPanel() {
    $$('.dropdown-menu').forEach((m) => m.remove());
    const btn = $('notif-btn');
    if (!btn) return;
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.style.minWidth = '280px';
    menu.style.padding = '10px';
    const items = [
      {
        t: 'New SOS incident raised',
        s: DB.sosEvents[0] ? timeAgo(DB.sosEvents[0].createdAt) : 'moments ago',
      },
      {
        t:
          'Low stock: ' +
          (DB.products.find((p: any) => p.available < 25) || {
            name: 'GPS Tracker T2 Pro',
          }).name,
        s: '2h ago',
      },
      { t: '12 memberships expiring this week', s: '5h ago' },
    ];
    menu.innerHTML =
      '<div style="font-weight:700;font-size:12.5px;padding:4px 6px 8px;">Notifications</div>' +
      items
        .map(
          (i) =>
            `<div style="padding:8px 6px;border-top:1px solid var(--border);"><div style="font-size:12.5px;font-weight:600;">${i.t}</div><div class="cell-sub">${i.s}</div></div>`
        )
        .join('');
    document.body.appendChild(menu);
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 8 + 'px';
    menu.style.right = window.innerWidth - rect.right + 'px';
    setTimeout(
      () =>
        document.addEventListener('click', function closeOnce(ev) {
          if (!menu.contains(ev.target as Node)) {
            menu.remove();
            document.removeEventListener('click', closeOnce);
          }
        }),
      0
    );
  }

  function updateProfileUI() {
    const user = apiClient.getAdminUser();
    const avatarEl = $q('.profile-btn .avatar');
    const nameEl = $q('.profile-name');
    const profileText = $('profile-text');
    if (user) {
      const fullName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
      if (avatarEl) avatarEl.textContent = initials(fullName);
      if (nameEl) nameEl.textContent = fullName;
      if (profileText) profileText.style.display = 'block';
    } else {
      if (avatarEl) avatarEl.textContent = 'SA';
      if (nameEl) nameEl.textContent = 'Super Admin';
      if (profileText) profileText.style.display = 'none';
    }
  }

  let isSignUpModalOpen = false;
  let isLoginModalOpen = false;

  function openSignUpModal(errorMessage: string = '') {
    window.location.href = '/signup';
    return;
    if (isSignUpModalOpen) {
      if (errorMessage) {
        const errEl = $('admin-signup-error');
        if (errEl) {
          errEl.textContent = errorMessage;
          errEl.style.display = 'block';
        }
      }
      return;
    }

    isSignUpModalOpen = true;
    isLoginModalOpen = false;
    const root = $('modal-root');
    if (!root) return;

    root.innerHTML = `
    <div class="overlay" style="cursor: default; backdrop-filter: blur(8px); background: rgba(15,23,42,0.85);"></div>
    <div class="modal" style="max-width: 520px; width: 100%; z-index: 1001; position: relative; max-height: 92vh; overflow-y: auto;">
      <div class="modal-head" style="border-bottom: 1px solid var(--border); padding-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="brand-mark" style="width: 32px; height: 32px; flex-shrink: 0;">
            <svg viewBox="44 53 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
              <path d="M91.765 62.1972C95.891 61.9652 100.819 62.0845 105.007 62.0857L127.477 62.0905L196.686 62.0775L238.086 62.0875C255.849 62.087 268.126 60.3125 282.646 72.7735C291.351 80.2455 296.701 90.8932 297.501 102.338C298.059 110.042 297.566 121.067 297.599 129.078L297.594 193.236L297.609 242.429L297.611 256.399C297.611 259.529 297.671 264.354 297.189 267.341C295.881 275.436 292.329 283.004 286.936 289.184C279.571 297.746 269.074 302.989 257.804 303.734C253.796 303.959 248.694 303.821 244.61 303.819L221.266 303.806L150.825 303.809L110.36 303.806C103.164 303.814 93.6347 304.169 86.6625 303.239C79.5027 302.281 70.8547 297.741 65.4665 293.014C57.5137 286.039 51.8692 275.109 51.2495 264.474C50.9755 259.769 51.036 254.784 51.0395 250.054L51.07 228.169L51.0387 162.704L51.031 121.297C51.0332 116.179 50.8052 103.498 51.5535 98.844C52.8752 90.7395 56.412 83.1582 61.773 76.9377C69.4157 68.2357 80.2067 62.9325 91.765 62.1972Z" fill="#16393F"/>
              <path d="M167.798 106.104C170.757 105.731 175.989 105.912 178.974 106.175C199.455 107.976 217.472 116.964 230.718 132.763C243.227 147.607 249.228 166.865 247.365 186.187C246.521 195.632 243.771 205.363 239.084 213.638C237.224 216.921 232.151 218.272 228.689 217.836C223.291 217.156 218.052 211.694 214.486 207.892C210.415 203.55 213.616 198.299 215.346 193.779C219.941 179.971 217.916 164.489 208.867 153.097C200.957 143.321 189.488 137.088 176.983 135.769C163.481 134.34 149.961 138.301 139.364 146.79C129.387 154.906 123.06 166.667 121.788 179.465C120.358 192.656 124.031 204.099 132.257 214.343C134.27 216.633 136.513 218.71 138.949 220.542C152.63 230.678 170.757 232.525 186.201 225.356C189.837 223.638 195.19 219.535 198.642 218.985C204.204 218.098 214.882 229.757 215.33 234.731C215.934 241.453 211.605 244.907 206.521 248.017C196.808 253.96 186.106 258.128 174.729 259.152C154.658 261.067 134.66 254.825 119.244 241.831C104.174 229.085 94.751 210.901 93.0258 191.24C91.3428 170.84 97.8415 150.609 111.089 135.006C125.876 117.469 145.062 108.033 167.798 106.104Z" fill="#FBFBF8"/>
              <path d="M237.109 226.224C246.202 224.831 254.703 231.078 256.088 240.173C257.473 249.268 251.218 257.763 242.122 259.14C233.037 260.515 224.555 254.27 223.172 245.186C221.788 236.103 228.026 227.616 237.109 226.224Z" fill="#F5A747"/>
            </svg>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Create Super Admin Account</h3>
            <div class="muted" style="font-size: 12px; margin-top: 2px;">Register primary platform authority credentials</div>
          </div>
        </div>
      </div>
      <form id="admin-signup-form" class="modal-body" style="padding: 20px 0 0 0;" novalidate>
        <div id="admin-signup-error" class="alert alert-danger" style="${errorMessage ? 'display:block;' : 'display:none;'
      } margin-bottom: 16px; padding: 10px 14px; font-size: 13px; border-radius: var(--radius-sm); color: var(--danger, #ef4444); background: var(--danger-bg, #fef2f2); border: 1px solid var(--danger, #fca5a5);">${escapeHtml(
        errorMessage
      )}</div>
        <div id="admin-signup-success" class="alert alert-success" style="display:none; margin-bottom: 16px; padding: 12px 14px; font-size: 13px; border-radius: var(--radius-sm); color: #065f46; background: #ecfdf5; border: 1px solid #6ee7b7; font-weight: 600;"></div>

        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="field">
            <label for="admin-signup-firstname" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">First Name *</label>
            <input id="admin-signup-firstname" type="text" placeholder="e.g. Alexander" required style="width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field">
            <label for="admin-signup-lastname" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">Last Name *</label>
            <input id="admin-signup-lastname" type="text" placeholder="e.g. Vance" required style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>

        <div class="form-grid" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; margin-bottom: 12px;">
          <div class="field">
            <label for="admin-signup-email" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">Work Email *</label>
            <input id="admin-signup-email" type="email" placeholder="superadmin@fioner.com" autocomplete="email" required style="width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field">
            <label for="admin-signup-phone" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">Phone (Optional)</label>
            <input id="admin-signup-phone" type="tel" placeholder="+91 98765 43210" style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>

        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px;">
          <div class="field">
            <label for="admin-signup-password" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">Password *</label>
            <input id="admin-signup-password" type="password" placeholder="e.g. FionerAdmin@2026" autocomplete="new-password" required style="width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field">
            <label for="admin-signup-confirm-password" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">Confirm Password *</label>
            <input id="admin-signup-confirm-password" type="password" placeholder="Re-enter password" autocomplete="new-password" required style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>
        <div class="muted" style="font-size: 11.5px; margin: 0 0 14px 2px; color: var(--text-muted);">
          Min 8 chars, including at least 1 uppercase letter (A-Z), 1 lowercase letter (a-z), and 1 number (0-9).
        </div>

        <div class="field" style="margin-bottom: 12px;">
          <label for="admin-signup-security-key" style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 5px;">
            Security Passcode / Master Secret Key *
          </label>
          <input id="admin-signup-security-key" type="password" placeholder="Enter platform secret passcode (e.g. FIONER@SUPERADMIN#2026)" required style="width: 100%; box-sizing: border-box; font-family: monospace;" />
          <div class="muted" style="font-size: 11px; margin-top: 4px;">Authorization key issued to primary platform super administrators.</div>
        </div>

        <div class="modal-foot" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
          <button id="admin-signup-submit" type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; height: 42px; font-size: 14px; font-weight: 600;">
            Create Super Admin Account
          </button>
          <div style="text-align: center; font-size: 12px; color: var(--text-muted);">
            Already have an account? <a href="javascript:void(0)" id="switch-to-login" style="color: var(--primary); font-weight: 600; text-decoration: none;">Sign In to Control Center</a>
          </div>
        </div>
      </form>
    </div>
  `;

    root.classList.add('open');

    const switchToLoginBtn = $('switch-to-login');
    if (switchToLoginBtn) {
      switchToLoginBtn.onclick = (e) => {
        e.preventDefault();
        isSignUpModalOpen = false;
        root.classList.remove('open');
        setTimeout(() => {
          openLoginModal();
        }, 150);
      };
    }

    const form = $('admin-signup-form') as HTMLFormElement;
    const fnInput = $('admin-signup-firstname') as HTMLInputElement;
    const lnInput = $('admin-signup-lastname') as HTMLInputElement;
    const emailInput = $('admin-signup-email') as HTMLInputElement;
    const phoneInput = $('admin-signup-phone') as HTMLInputElement;
    const passInput = $('admin-signup-password') as HTMLInputElement;
    const confirmPassInput = $('admin-signup-confirm-password') as HTMLInputElement;
    const keyInput = $('admin-signup-security-key') as HTMLInputElement;
    const submitBtn = $('admin-signup-submit') as HTMLButtonElement;
    const errorDiv = $('admin-signup-error') as HTMLElement;
    const successDiv = $('admin-signup-success') as HTMLElement;

    if (fnInput) setTimeout(() => fnInput.focus(), 80);

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const firstName = (fnInput?.value || '').trim();
        const lastName = (lnInput?.value || '').trim();
        const email = (emailInput?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();
        const password = passInput?.value || '';
        const confirmPassword = confirmPassInput?.value || '';
        const securityKey = (keyInput?.value || '').trim();

        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';

        // Validations
        if (!firstName || firstName.length < 2) {
          if (errorDiv) {
            errorDiv.textContent = 'Please enter a valid first name (at least 2 characters).';
            errorDiv.style.display = 'block';
          }
          if (fnInput) fnInput.focus();
          return;
        }

        if (!lastName) {
          if (errorDiv) {
            errorDiv.textContent = 'Please enter your last name.';
            errorDiv.style.display = 'block';
          }
          if (lnInput) lnInput.focus();
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          if (errorDiv) {
            errorDiv.textContent = 'Please enter a valid work email address.';
            errorDiv.style.display = 'block';
          }
          if (emailInput) emailInput.focus();
          return;
        }

        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);

        if (!password || password.length < 8 || !hasLower || !hasUpper || !hasNumber) {
          if (errorDiv) {
            errorDiv.textContent =
              'Password must be at least 8 characters and include at least one uppercase letter (A-Z), one lowercase letter (a-z), and one number (0-9).';
            errorDiv.style.display = 'block';
          }
          if (passInput) passInput.focus();
          return;
        }

        if (password !== confirmPassword) {
          if (errorDiv) {
            errorDiv.textContent = 'Passwords do not match. Please verify both fields.';
            errorDiv.style.display = 'block';
          }
          if (confirmPassInput) confirmPassInput.focus();
          return;
        }

        if (!securityKey) {
          if (errorDiv) {
            errorDiv.textContent = 'Master Security Passcode / Secret Key is required.';
            errorDiv.style.display = 'block';
          }
          if (keyInput) keyInput.focus();
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner"></span> Creating Account…';
        }

        try {
          const res = await apiClient.adminRegister({
            firstName,
            lastName,
            email,
            phone: phone || undefined,
            password,
            confirmPassword,
            securityKey,
          });

          if (successDiv) {
            successDiv.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">✓</span>
                <div>
                  <div>${escapeHtml(res.message || 'Super Admin registered successfully!')}</div>
                  <div style="font-size: 12px; font-weight: 400; margin-top: 3px; opacity: 0.9;">Redirecting to sign-in form automatically...</div>
                </div>
              </div>
            `;
            successDiv.style.display = 'block';
          }

          if (submitBtn) {
            submitBtn.innerHTML = 'Account Created! Redirecting…';
          }

          try {
            localStorage.setItem('fioner_super_admin_registered', 'true');
          } catch { }

          // Automatically redirect to the login form after successful registration
          setTimeout(() => {
            isSignUpModalOpen = false;
            root.classList.remove('open');
            location.hash = '#/login';
            setTimeout(() => {
              openLoginModal(email, 'Account created successfully! Please sign in with your credentials.');
            }, 200);
          }, 1600);
        } catch (err: any) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Super Admin Account';
          }
          if (errorDiv) {
            errorDiv.textContent =
              err.message || 'Registration failed. Please check your information and security key.';
            errorDiv.style.display = 'block';
          }
        }
      };
    }
  }

  function openLoginModal(prefilledEmail: string = '', errorMessage: string = '') {
    window.location.href = '/login';
    return;
    if (isLoginModalOpen) {
      if (errorMessage) {
        const errEl = $('admin-login-error');
        if (errEl) {
          errEl.textContent = errorMessage;
          errEl.style.display = 'block';
        }
      }
      return;
    }

    isLoginModalOpen = true;
    isSignUpModalOpen = false;
    const root = $('modal-root');
    if (!root) return;

    const defaultEmail = prefilledEmail || 'admin@connect.com';
    const defaultPass = prefilledEmail ? '' : 'Password123';

    root.innerHTML = `
    <div class="overlay" style="cursor: default; backdrop-filter: blur(8px); background: rgba(15,23,42,0.85);"></div>
    <div class="modal" style="max-width: 440px; width: 100%; z-index: 1001; position: relative;">
      <div class="modal-head" style="border-bottom: 1px solid var(--border); padding-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="brand-mark" style="width: 30px; height: 30px; flex-shrink: 0;">
            <svg viewBox="44 53 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
              <path d="M91.765 62.1972C95.891 61.9652 100.819 62.0845 105.007 62.0857L127.477 62.0905L196.686 62.0775L238.086 62.0875C255.849 62.087 268.126 60.3125 282.646 72.7735C291.351 80.2455 296.701 90.8932 297.501 102.338C298.059 110.042 297.566 121.067 297.599 129.078L297.594 193.236L297.609 242.429L297.611 256.399C297.611 259.529 297.671 264.354 297.189 267.341C295.881 275.436 292.329 283.004 286.936 289.184C279.571 297.746 269.074 302.989 257.804 303.734C253.796 303.959 248.694 303.821 244.61 303.819L221.266 303.806L150.825 303.809L110.36 303.806C103.164 303.814 93.6347 304.169 86.6625 303.239C79.5027 302.281 70.8547 297.741 65.4665 293.014C57.5137 286.039 51.8692 275.109 51.2495 264.474C50.9755 259.769 51.036 254.784 51.0395 250.054L51.07 228.169L51.0387 162.704L51.031 121.297C51.0332 116.179 50.8052 103.498 51.5535 98.844C52.8752 90.7395 56.412 83.1582 61.773 76.9377C69.4157 68.2357 80.2067 62.9325 91.765 62.1972Z" fill="#16393F"/>
              <path d="M167.798 106.104C170.757 105.731 175.989 105.912 178.974 106.175C199.455 107.976 217.472 116.964 230.718 132.763C243.227 147.607 249.228 166.865 247.365 186.187C246.521 195.632 243.771 205.363 239.084 213.638C237.224 216.921 232.151 218.272 228.689 217.836C223.291 217.156 218.052 211.694 214.486 207.892C210.415 203.55 213.616 198.299 215.346 193.779C219.941 179.971 217.916 164.489 208.867 153.097C200.957 143.321 189.488 137.088 176.983 135.769C163.481 134.34 149.961 138.301 139.364 146.79C129.387 154.906 123.06 166.667 121.788 179.465C120.358 192.656 124.031 204.099 132.257 214.343C134.27 216.633 136.513 218.71 138.949 220.542C152.63 230.678 170.757 232.525 186.201 225.356C189.837 223.638 195.19 219.535 198.642 218.985C204.204 218.098 214.882 229.757 215.33 234.731C215.934 241.453 211.605 244.907 206.521 248.017C196.808 253.96 186.106 258.128 174.729 259.152C154.658 261.067 134.66 254.825 119.244 241.831C104.174 229.085 94.751 210.901 93.0258 191.24C91.3428 170.84 97.8415 150.609 111.089 135.006C125.876 117.469 145.062 108.033 167.798 106.104Z" fill="#FBFBF8"/>
              <path d="M237.109 226.224C246.202 224.831 254.703 231.078 256.088 240.173C257.473 249.268 251.218 257.763 242.122 259.14C233.037 260.515 224.555 254.27 223.172 245.186C221.788 236.103 228.026 227.616 237.109 226.224Z" fill="#F5A747"/>
            </svg>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 700;">Super Admin Sign In</h3>
            <div class="muted" style="font-size: 12px; margin-top: 2px;">Enter credentials to access Control Center</div>
          </div>
        </div>
      </div>
      <form id="admin-login-form" class="modal-body" style="padding: 20px 0 0 0;" novalidate>
        <div id="admin-login-error" class="alert alert-danger" style="${errorMessage ? 'display:block;' : 'display:none;'
      } margin-bottom: 16px; padding: 10px 14px; font-size: 13px; border-radius: var(--radius-sm); color: var(--danger, #ef4444); background: var(--danger-bg, #fef2f2); border: 1px solid var(--danger, #fca5a5);">${escapeHtml(
        errorMessage
      )}</div>
        <div class="form-grid single" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="field">
            <label for="admin-login-email" style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 6px;">Administrator Email</label>
            <input id="admin-login-email" type="email" placeholder="admin@connect.com" autocomplete="username" value="${escapeHtml(
        defaultEmail
      )}" required style="width: 100%; box-sizing: border-box;" />
          </div>
          <div class="field">
            <label for="admin-login-password" style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 6px;">Password</label>
            <input id="admin-login-password" type="password" placeholder="••••••••••••" autocomplete="current-password" value="${escapeHtml(
        defaultPass
      )}" required style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>
        <div class="modal-foot" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px;">
          <button id="admin-login-submit" type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; height: 42px; font-size: 14px; font-weight: 600;">
            Sign In to Control Center
          </button>
          <div style="text-align: center; font-size: 12px; color: var(--text-muted);">
            Need a primary account? <a href="javascript:void(0)" id="switch-to-signup" style="color: var(--primary); font-weight: 600; text-decoration: none;">Create Super Admin</a>
          </div>
        </div>
      </form>
    </div>
  `;

    root.classList.add('open');

    const switchToSignupBtn = $('switch-to-signup');
    if (switchToSignupBtn) {
      switchToSignupBtn.onclick = (e) => {
        e.preventDefault();
        isLoginModalOpen = false;
        root.classList.remove('open');
        setTimeout(() => {
          openSignUpModal();
        }, 150);
      };
    }

    const form = $('admin-login-form') as HTMLFormElement;
    const emailInput = $('admin-login-email') as HTMLInputElement;
    const passInput = $('admin-login-password') as HTMLInputElement;
    const submitBtn = $('admin-login-submit') as HTMLButtonElement;
    const errorDiv = $('admin-login-error') as HTMLElement;

    if (emailInput && !prefilledEmail) {
      setTimeout(() => emailInput.focus(), 80);
    } else if (passInput) {
      setTimeout(() => passInput.focus(), 80);
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const email = (emailInput?.value || '').trim();
        const password = passInput?.value || '';

        if (!email || !password) {
          if (errorDiv) {
            errorDiv.textContent = 'Please enter both email and password.';
            errorDiv.style.display = 'block';
          }
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner"></span> Authenticating…';
        }
        if (errorDiv) errorDiv.style.display = 'none';

        try {
          const authRes = await apiClient.login(email, password);
          try {
            localStorage.setItem('fioner_super_admin_registered', 'true');
          } catch { }
          isLoginModalOpen = false;
          root.classList.remove('open');
          setTimeout(() => {
            root.innerHTML = '';
          }, 200);

          updateProfileUI();
          const greetingName = authRes.user?.firstName || 'Administrator';
          showToast(`Welcome back, ${greetingName}.`, 'success');

          resetDB();
          void initAdminSocket();
          location.hash = '#/dashboard';
          window.removeEventListener('hashchange', onHashChange);
          window.addEventListener('hashchange', onHashChange);
          onHashChange();
        } catch (err: any) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In to Control Center';
          }
          if (errorDiv) {
            errorDiv.textContent =
              err.message || 'Authentication failed. Please verify credentials.';
            errorDiv.style.display = 'block';
          }
        }
      };
    }
  }

  function toggleProfilePanel() {
    $$('.dropdown-menu').forEach((m) => m.remove());
    const btn = $q('.profile-btn');
    if (!btn) return;
    const user = apiClient.getAdminUser();
    const userName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Super Admin';
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.innerHTML = `<button data-close>${ic('users')} ${escapeHtml(
      userName
    )}</button><button data-close>${ic(
      'shield'
    )} Permissions: Super Admin</button><hr><button data-close class="danger" id="admin-signout-btn">${ic(
      'logout'
    )} Sign out</button>`;
    document.body.appendChild(menu);
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 8 + 'px';
    menu.style.right = window.innerWidth - rect.right + 'px';
    menu.querySelectorAll('button').forEach(
      (b) =>
      (b.onclick = () => {
        menu.remove();
        if (b.textContent?.includes('Sign out')) {
          disconnectAdminSocket();
          apiClient.clearAuth();
          resetDB();
          updateProfileUI();
          showToast('Signed out successfully.', 'info');
          window.location.href = window.location.pathname;
        }
      })
    );
    setTimeout(
      () =>
        document.addEventListener('click', function closeOnce(ev) {
          if (!menu.contains(ev.target as Node)) {
            menu.remove();
            document.removeEventListener('click', closeOnce);
          }
        }),
      0
    );
  }

  function updateThemeIcon() {
    const themeBtn = $('theme-btn');
    if (!themeBtn) return;
    const cur = document.documentElement.getAttribute('data-theme');
    themeBtn.innerHTML = ic(cur === 'dark' ? 'sun' : 'moon');
  }

  function boot() {
    loadDB();
    let theme;
    try {
      theme = localStorage.getItem(THEME_KEY);
    } catch (e) {
      theme = null;
    }
    const activeTheme = theme || 'dark';
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const notifBtn = $('notif-btn');
    if (notifBtn) {
      notifBtn.innerHTML = ic('bell');
      notifBtn.insertAdjacentHTML(
        'beforeend',
        (DB.sosEvents || []).some((s: any) => s.status === 'pending')
          ? '<span class="dot-flag"></span>'
          : ''
      );
    }
    updateThemeIcon();
    renderNav();
    updateProfileUI();
    const initialRoute = parseHash().name;
    if (!location.hash) {
      location.hash = '#/dashboard';
    }
    if (initialRoute !== 'login' && initialRoute !== 'signup') {
      onHashChange();
    }
    window.addEventListener('hashchange', onHashChange);
    setTimeout(async () => {
      const splash = $('splash');
      if (splash) splash.classList.add('hide');
      const app = $('app');
      if (app) app.style.display = 'grid';
      if (apiClient.getToken()) {
        void initAdminSocket();
        // Prefetch top routes in background on idle so clicks are instantaneous
        const prefetch = () => {
          syncDashboard().catch(() => {});
          syncVehicles().catch(() => {});
          syncQrCodes().catch(() => {});
          syncUsers().catch(() => {});
          syncOrders().catch(() => {});
          syncGpsDevices().catch(() => {});
        };
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(prefetch);
        } else {
          setTimeout(prefetch, 100);
        }
      }
      if (!apiClient.getToken()) {
        return;
      }
    }, 25);
  }

  const unregisterAuth = apiClient.onUnauthorized(() => {
    disconnectAdminSocket();
    apiClient.clearAuth();
    resetDB();
    updateProfileUI();
  });

  boot();

  return function cleanup() {
    try {
      unregisterAuth();
    } catch (e) { }
    try {
      window.removeEventListener('hashchange', onHashChange);
    } catch (e) { }
    try {
      document.removeEventListener('click', handleDocumentClick);
    } catch (e) { }
    try {
      document.removeEventListener('input', handleDocumentInput);
    } catch (e) { }
    try {
      document.removeEventListener('change', handleDocumentChange);
    } catch (e) { }
    try {
      document.removeEventListener('keydown', handleDocumentKeydown);
    } catch (e) { }
    __fionerAdminBooted = false;
  };
}
