'use client';

import React, { useEffect } from 'react';
import {
  $,
  ic,
  fmtINR,
  statusBadge,
  renderEmpty,
  mountAnimations,
  showToast,
  apiClient,
  DB,
  registerRoute,
  registerActions,
  state,
  rerenderRoute,
} from '../../lib/adminShared';
import { syncUsers } from './Users';
import { syncQrCodes } from './Qrcodes';
import { syncGpsDevices } from './Gpsdevices';
import { syncSosEvents } from './Sos';
import { syncOrders } from './Orders';
import { syncProducts } from './Inventory';

export let dashboardServerState: any = null;
export let dashboardHydration: Promise<void> | null = null;
export let dashboardDataFetched = false;

export async function syncDashboard() {
  if (!apiClient.getToken()) return null;
  const [overview, alerts] = await Promise.allSettled([
    apiClient.get('/admin/dashboard'),
    apiClient.get('/admin/dashboard/alerts'),
  ]);
  dashboardServerState = {
    overview: overview.status === 'fulfilled' ? overview.value : null,
    alerts: alerts.status === 'fulfilled' ? alerts.value : null,
  };
  return dashboardServerState;
}

export async function hydrateDashboard(force = false) {
  if (!apiClient.getToken()) return;
  if (force) dashboardDataFetched = false;
  if (dashboardDataFetched) return;
  if (!dashboardHydration) {
    dashboardHydration = Promise.all([
      syncDashboard(),
      syncUsers(),
      syncQrCodes(),
      syncGpsDevices(),
      syncSosEvents(),
      syncOrders(),
      syncProducts(),
    ])
      .then(() => {
        dashboardDataFetched = true;
      })
      .finally(() => {
        dashboardHydration = null;
      });
  }
  return dashboardHydration;
}

export function renderDashboardView() {
  const metrics = dashboardServerState?.overview?.metrics;
  const activeSos = metrics?.sos?.active ?? (DB.sosEvents || []).filter((s: any) => s.status !== 'resolved').length;
  const activeQr = metrics?.qrCodes?.active ?? (DB.qrCodes || []).filter((q: any) => q.status === 'active' || q.status === 'assigned').length;
  const activeGps = metrics?.gpsDevices?.active ?? (DB.gpsDevices || []).filter((g: any) => g.status === 'active').length;
  const revenue = metrics?.orders?.revenue ?? (DB.orders || []).filter((o: any) => o.payStatus === 'Paid').reduce((a: number, o: any) => a + o.amount, 0);
  const activeMembers = metrics?.subscriptions?.active ?? (DB.subscriptions || []).filter((s: any) => s.status === 'active').length;
  const recentOrders = (DB.orders || []).slice().sort((a: any, b: any) => b.placedAt - a.placedAt).slice(0, 5);
  const recentSos = (DB.sosEvents || []).slice().sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 4);
  const topProducts = (DB.products || []).slice().sort((a: any, b: any) => b.dispatched - a.dispatched).slice(0, 5);
  const pageViews = (DB.qrCodes || []).reduce((a: number, q: any) => a + Number(q.scansCount ?? q.scans ?? 0), 0);
  const visitors = metrics?.users?.total ?? (DB.users || []).length;
  const totalOrders = metrics?.orders?.total ?? (DB.orders || []).length;

  const viewEl = $('view');
  if (!viewEl) return;

  if (!dashboardDataFetched && !dashboardHydration) {
    hydrateDashboard()
      .then(() => {
        if (state.route.name === 'dashboard') {
          renderDashboardView();
        }
      })
      .catch(() => undefined);
  }

  viewEl.innerHTML = `
    <div class="dashboard-toolbar">
      <div></div>
      <div class="dash-actions">
        <button class="btn btn-sm" data-action="refresh-dashboard">${ic('refresh')} Refresh live data</button>
        <button class="btn btn-sm">${ic('clock')} Live Metrics</button>
      </div>
    </div>

    <div class="shop-layout" style="grid-template-columns:1fr; width:100%;">
      <section class="shop-main" style="width:100%;">
        <div class="grid grid-4">
          <div class="stat-card shop-stat">
            <div class="stat-label">Page Views <span class="metric-icon">${ic('eye')}</span></div>
            <div class="stat-row"><span class="stat-num" data-target="${pageViews}">0</span><span class="stat-delta">—</span></div>
            <div class="shop-compare">Current recorded scans</div>
          </div>
          <div class="stat-card shop-stat">
            <div class="stat-label">Visitors <span class="metric-icon">${ic('users')}</span></div>
            <div class="stat-row"><span class="stat-num" data-target="${visitors}">0</span><span class="stat-delta">—</span></div>
            <div class="shop-compare">Registered users</div>
          </div>
          <div class="stat-card shop-stat">
            <div class="stat-label">Click <span class="metric-icon">${ic('externalLink')}</span></div>
            <div class="stat-row"><span class="stat-num" data-target="${pageViews}">0</span><span class="stat-delta">—</span></div>
            <div class="shop-compare">Recorded QR interactions</div>
          </div>
          <div class="stat-card shop-stat">
            <div class="stat-label">Orders <span class="metric-icon">${ic('box')}</span></div>
            <div class="stat-row"><span class="stat-num" data-target="${totalOrders}">0</span><span class="stat-delta">—</span></div>
            <div class="shop-compare">Current database total</div>
          </div>
        </div>

        <div class="grid grid-4" style="margin-top:14px;">
          <div class="stat-card"><div class="stat-bar" style="background:var(--accent)"></div><div class="stat-label">Paid Revenue</div><div class="stat-row"><span class="stat-num" data-target="${revenue}" data-money="1">₹0</span></div></div>
          <div class="stat-card"><div class="stat-bar" style="background:var(--success)"></div><div class="stat-label">Active QR codes</div><div class="stat-row"><span class="stat-num" data-target="${activeQr}">0</span></div></div>
          <div class="stat-card"><div class="stat-bar" style="background:var(--info)"></div><div class="stat-label">GPS devices</div><div class="stat-row"><span class="stat-num" data-target="${activeGps}">0</span></div></div>
          <div class="stat-card"><div class="stat-bar" style="background:var(--danger)"></div><div class="stat-label">Active SOS</div><div class="stat-row"><span class="stat-num" data-target="${activeSos}">0</span></div></div>
        </div>

        <div class="two-col" style="margin-top:14px;">
          <div class="card">
            <div class="card-title">Recent Orders</div>
            ${recentOrders.length ? `<div class="list-simple">${recentOrders.map((o: any) => `<div class="list-simple-row" style="cursor:pointer;" data-action="view-order" data-id="${o.id}"><div><div style="font-weight:600;font-size:13px;" class="mono">${o.orderNo}</div><div class="cell-sub">${o.customerName || 'Customer'}</div></div><div class="hstack">${statusBadge(o.payStatus)}<b>${fmtINR(o.amount || 0)}</b></div></div>`).join('')}</div>` : renderEmpty('No orders recorded', 'Orders placed by customers will appear here.', 'box')}
          </div>
          <div class="card">
            <div class="card-title">Recent SOS Incidents</div>
            ${recentSos.length ? `<div class="list-simple">${recentSos.map((s: any) => `<div class="list-simple-row" style="cursor:pointer;" data-action="view-sos" data-id="${s.id}"><div><div style="font-weight:600;font-size:13px;">${s.userName || 'User'}</div><div class="cell-sub mono">${s.vehicleReg || '—'}</div></div>${statusBadge(s.status)}</div>`).join('')}</div>` : renderEmpty('No recent SOS events', 'Every incident will appear here the moment it is triggered.', 'shield')}
          </div>
        </div>
      </section>
    </div>
  `;
  mountAnimations();
}

export function registerDashboardSection() {
  registerRoute('dashboard', renderDashboardView);

  registerActions({
    'refresh-dashboard': async (el: any) => {
      const btn = el ? el.closest('button') : null;
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
    },
  });
}

// Auto-register upon import
registerDashboardSection();

export default function Dashboard() {
  useEffect(() => {
    renderDashboardView();
  }, []);

  return <div id="dashboard-component-root" />;
}
