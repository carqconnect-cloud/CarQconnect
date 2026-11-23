'use client';

import React, { useEffect } from 'react';
import {
  $,
  $$,
  ic,
  escapeHtml,
  fmtDate,
  fmtINR,
  timeAgo,
  openDrawer,
  openModal,
  closeModal,
  showToast,
  renderSkeletonTable,
  tableState,
  registerTable,
  refreshTable,
  buildTable,
  apiClient,
  DB,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

/* =========================================================================
   HELPERS & TABS
========================================================================= */
export const orderStatusTabs = [
  { key: 'all', label: 'All Orders' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PAID', label: 'Paid' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export const orderCategoryTabs = [
  { key: 'all', label: 'All Orders' },
  { key: 'qr', label: 'QR Codes' },
  { key: 'product', label: 'Product' },
];

export const orderTabs = orderStatusTabs;

export function resolveProductImage(img?: string): string {
  if (!img) return '';
  const trimmed = img.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return '/' + trimmed;
}

export function renderOrderStatusBadge(status: string) {
  const s = (status || 'PENDING').toUpperCase();
  let cls = 'badge-warning';
  if (s === 'PAID') cls = 'badge-info';
  if (s === 'SHIPPED') cls = 'badge-primary';
  if (s === 'DELIVERED') cls = 'badge-success';
  if (s === 'CANCELLED') cls = 'badge-danger';
  return `<span class="badge ${cls}" style="font-weight:600;text-transform:capitalize;">${escapeHtml(s.toLowerCase())}</span>`;
}

export function renderPaymentBadge(payStatus: string) {
  const p = (payStatus || 'PENDING').toUpperCase();
  if (p === 'COD') {
    return `<span class="badge" style="background:#7c3aed;color:#ffffff;font-weight:700;padding:4px 8px;border-radius:6px;font-size:11px;letter-spacing:0.5px;box-shadow:0 1px 3px rgba(124,58,237,0.3);">COD</span>`;
  }
  if (p === 'PAID') {
    return `<span class="badge badge-success" style="font-weight:600;">Paid</span>`;
  }
  if (p === 'CANCELLED' || p === 'FAILED') {
    return `<span class="badge badge-danger" style="font-weight:600;">Cancelled</span>`;
  }
  return `<span class="badge badge-warning" style="font-weight:600;">Pending</span>`;
}

export function isQrOrder(o: any): boolean {
  if (!o) return false;
  if (Array.isArray(o.items) && o.items.length > 0) {
    const hasQr = o.items.some((it: any) => {
      const cat = String(it.category || '').toLowerCase();
      const title = String(it.productTitle || '').toLowerCase();
      return cat.includes('qr') || title.includes('qr') || cat === 'qr tag' || cat === 'smart qr tag';
    });
    if (hasQr) return true;
  }
  const prod = String(o.product || '').toLowerCase();
  const cat = String(o.category || '').toLowerCase();
  return prod.includes('qr') || cat.includes('qr');
}

export function isProductOrder(o: any): boolean {
  return !isQrOrder(o);
}

/* =========================================================================
   ENTITY MAPPER
========================================================================= */
export function mapOrderFromApi(o: any) {
  if (!o) return null;
  const items = Array.isArray(o.items) ? o.items : [];
  const totalQty = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const firstItem = items[0] || {};
  const firstTitle = firstItem.productTitle || firstItem.product?.title || 'Store Product';
  const productSummary = items.length > 1 ? `${firstTitle} (+${items.length - 1} more)` : firstTitle;
  const productImage = firstItem.productImage || firstItem.product?.image || 'assets/homescreensicons/obd_dongle.png';

  const customerName =
    o.customerName ||
    (o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() : '') ||
    'Customer';

  const isCOD =
    o.payStatus === 'COD' ||
    !o.paymentId ||
    o.paymentId === 'COD' ||
    o.paymentOrderId === 'CASH_ON_DELIVERY';

  const payStatus =
    o.status === 'CANCELLED'
      ? 'CANCELLED'
      : o.status === 'PAID' || o.status === 'DELIVERED'
      ? 'PAID'
      : isCOD
      ? 'COD'
      : String(o.payStatus || (o.paymentId ? 'PAID' : 'PENDING')).toUpperCase();

  const paymentMethod = isCOD ? 'Cash on Delivery (COD)' : 'Online (Razorpay)';

  return {
    id: o.id,
    orderNo: o.orderNo || `ORD-${o.id.slice(0, 8).toUpperCase()}`,
    userId: o.userId,
    customerId: o.userId,
    customerName,
    customerEmail: o.customerEmail || o.user?.email || '',
    customerPhone: o.customerPhone || o.user?.phone || '—',
    shippingAddress:
      o.shippingAddress ||
      (o.address
        ? {
            type: o.address.type || 'Home',
            address: o.address.address || '',
            landmark: o.address.landmark || '',
            city: o.address.city || '',
            state: o.address.state || '',
            pincode: o.address.pincode || '',
          }
        : null),
    items: items.map((it: any) => ({
      id: it.id,
      productId: it.productId,
      productTitle: it.productTitle || it.product?.title || 'Product',
      productSubtitle: it.productSubtitle || it.product?.subtitle || '',
      productImage: it.productImage || it.product?.image || 'assets/homescreensicons/obd_dongle.png',
      category: it.category || it.product?.category || 'Hardware',
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || it.price || 0,
      totalPrice: (it.unitPrice || it.price || 0) * (it.quantity || 1),
    })),
    product: productSummary,
    productImage,
    qty: totalQty || o.qty || 1,
    amount: o.amount ?? o.totalAmount ?? 0,
    status: (o.status || 'PENDING').toUpperCase(),
    payStatus,
    paymentMethod,
    paymentId: o.paymentId || (isCOD ? 'COD' : null),
    paymentOrderId: o.paymentOrderId || (isCOD ? 'CASH_ON_DELIVERY' : null),
    awbNumber: o.awbNumber || o.awb || o.trackingNumber || (o.status === 'SHIPPED' || o.status === 'DELIVERED' ? `SR${(o.id || '').slice(0, 10).toUpperCase()}` : null),
    courierName: o.courierName || o.courier || (o.status === 'SHIPPED' || o.status === 'DELIVERED' ? 'Shiprocket (Delhivery Surface)' : null),
    shipmentStatus: o.shipmentStatus || (o.status === 'DELIVERED' ? 'DELIVERED' : o.status === 'SHIPPED' ? 'IN_TRANSIT' : 'READY_TO_SHIP'),
    placedAt: new Date(o.placedAt || o.createdAt || Date.now()).getTime(),
    raw: o,
  };
}

/* =========================================================================
   SERVER SYNCHRONIZER
========================================================================= */
export async function syncOrders(query: any = {}) {
  if (!apiClient.getToken()) return DB.orders || [];
  const res: any = await apiClient.get('/admin/orders', { page: 1, limit: 100, ...query });
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.orders = rawItems.map(mapOrderFromApi).filter(Boolean);
  return DB.orders;
}

export async function syncOrderStats() {
  if (!apiClient.getToken()) return;
  try {
    const res: any = await apiClient.get('/admin/orders/stats');
    const stats = res?.data || res;
    if (stats) {
      const kpiTotal = $('kpi-total-orders');
      if (kpiTotal) kpiTotal.innerText = String(stats.totalOrders ?? 0);
      const kpiRev = $('kpi-revenue-orders');
      if (kpiRev) kpiRev.innerText = fmtINR(stats.totalRevenue ?? 0);
      const kpiPend = $('kpi-pending-orders');
      if (kpiPend) kpiPend.innerText = String(stats.pendingOrders ?? 0);
      const kpiDeliv = $('kpi-delivered-orders');
      if (kpiDeliv) kpiDeliv.innerText = String(stats.deliveredOrders ?? 0);
    }
  } catch (e) {
    console.warn('Failed to sync order stats:', e);
  }
}

/* =========================================================================
   COLUMNS & TABLE
========================================================================= */
export function orderColumns(orderType: 'all' | 'qr' | 'product' = 'all') {
  return [
    {
      key: 'orderNo',
      label: 'Order ID',
      sortable: true,
      render: (r: any) => `
        <div>
          <span class="mono cell-primary" style="font-weight:700;color:var(--primary);letter-spacing:0.5px;">${escapeHtml(
            r.orderNo,
          )}</span>
          <div class="cell-sub" style="font-size:11px;opacity:0.75;">${timeAgo(r.placedAt)}</div>
        </div>
      `,
    },
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (r: any) => `
        <div>
          <div style="font-weight:600;">${escapeHtml(r.customerName)}</div>
          <div class="cell-sub" style="font-size:12px;opacity:0.75;">${escapeHtml(
            r.customerPhone !== '—' ? r.customerPhone : r.customerEmail,
          )}</div>
        </div>
      `,
    },
    {
      key: 'product',
      label: 'Items Ordered',
      sortable: false,
      render: (r: any) => {
        const isQr = isQrOrder(r);
        const imgSrc = resolveProductImage(r.productImage);
        const typeBadge = isQr
          ? `<span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-size:10px;padding:1px 6px;margin-left:6px;border-radius:4px;font-weight:600;">QR TAG</span>`
          : `<span class="badge" style="background:rgba(99,102,241,0.15);color:#6366f1;font-size:10px;padding:1px 6px;margin-left:6px;border-radius:4px;font-weight:600;">DEVICE</span>`;
        return `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:38px;height:38px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;position:relative;">
            ${
              imgSrc
                ? `<img src="${escapeHtml(
                    imgSrc,
                  )}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">`
                : ''
            }
            <span style="${imgSrc ? 'display:none;' : 'display:flex;'}width:100%;height:100%;align-items:center;justify-content:center;opacity:0.6;">${ic(
              isQr ? 'qrcode' : 'box',
            )}</span>
          </div>
          <div>
            <div style="display:flex;align-items:center;">
              <span style="font-weight:600;font-size:13px;">${escapeHtml(r.product)}</span>
              ${typeBadge}
            </div>
            <div class="cell-sub" style="font-size:11.5px;opacity:0.75;">Total Qty: <b>${r.qty}</b></div>
          </div>
        </div>
      `;
      },
    },
    {
      key: 'amount',
      label: 'Amount (₹)',
      sortable: true,
      align: 'right',
      render: (r: any) => `<div style="font-weight:700;font-size:13.5px;">${fmtINR(r.amount)}</div>`,
    },
    {
      key: 'payStatus',
      label: 'Payment',
      sortable: true,
      align: 'center',
      render: (r: any) => renderPaymentBadge(r.payStatus),
    },
    {
      key: 'status',
      label: 'Fulfilment',
      sortable: true,
      align: 'center',
      render: (r: any) => renderOrderStatusBadge(r.status),
    },
    {
      key: 'placedAt',
      label: 'Placed Date',
      sortable: true,
      render: (r: any) => `<span style="font-size:12.5px;">${fmtDate(r.placedAt)}</span>`,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (r: any) => `
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;" onclick="event.stopPropagation();">
          <button class="btn btn-sm btn-ghost" data-action="view-order" data-id="${r.id}" title="View Details" style="cursor:pointer;padding:4px 8px;font-size:12px;">
            ${ic('eye')} View
          </button>
        </div>
      `,
    },
  ];
}

/* =========================================================================
   ORDER DRAWER
========================================================================= */
export async function openOrderDrawer(id: string) {
  const head = `
    <div class="drawer-head">
      <div>
        <h3 class="mono">Order Details</h3>
        <div class="muted" style="font-size:12.5px;margin-top:2px;">Loading order…</div>
      </div>
      <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div>
    </div>
  `;
  openDrawer(head, [{ key: 'overview', label: 'Order Overview' }], 'overview', () =>
    '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading order data…</div>',
  );

  try {
    const raw: any = await apiClient.get(`/admin/orders/${id}`);
    const oData = raw?.data || raw;
    const o = mapOrderFromApi(oData);
    if (!o) throw new Error('Order not found');

    const isQr = isQrOrder(o);
    const orderTypePill = isQr
      ? `<span class="badge" style="background:rgba(16,185,129,0.18);color:#10b981;font-weight:700;font-size:11px;padding:3px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:4px;">${ic('qrcode')} QR ORDER</span>`
      : `<span class="badge" style="background:rgba(99,102,241,0.18);color:#6366f1;font-weight:700;font-size:11px;padding:3px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:4px;">${ic('box')} PRODUCT ORDER</span>`;

    const liveHead = `
      <div class="drawer-head">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 class="mono" style="margin:0;font-size:16px;">${escapeHtml(o.orderNo)}</h3>
            ${orderTypePill}
            ${renderOrderStatusBadge(o.status)}
            ${renderPaymentBadge(o.payStatus)}
          </div>
          <div class="muted" style="font-size:12px;margin-top:4px;">
            Placed by <b>${escapeHtml(o.customerName)}</b> · ${fmtDate(o.placedAt)}
          </div>
        </div>
        <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div>
      </div>
    `;

    const tabs = [
      { key: 'overview', label: 'Items & Customer' },
      { key: 'fulfil', label: 'Status & Fulfilment' },
      { key: 'notes', label: 'Internal Notes' },
    ];

    function render(tab: string) {
      if (tab === 'overview') {
        const addr = o.shippingAddress;
        return `
          <div style="margin-bottom:16px;">
            <h4 style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Customer & Delivery Details</h4>
            <div class="kv-grid" style="grid-template-columns:repeat(2, 1fr);gap:12px;">
              <div class="kv"><span class="k">Customer Name</span><span class="v" style="font-weight:600;">${escapeHtml(o.customerName)}</span></div>
              <div class="kv"><span class="k">Phone</span><span class="v">${escapeHtml(o.customerPhone)}</span></div>
              <div class="kv"><span class="k">Email Address</span><span class="v">${escapeHtml(o.customerEmail || '—')}</span></div>
              <div class="kv"><span class="k">Address Type</span><span class="v"><span class="badge badge-info">${escapeHtml(addr?.type || 'Home')}</span></span></div>
              <div class="kv" style="grid-column:span 2;">
                <span class="k">Delivery Address</span>
                <span class="v" style="font-weight:500;">
                  ${escapeHtml(addr?.address || 'No address provided')}
                  ${addr?.landmark ? `<br><small class="muted">Landmark: ${escapeHtml(addr.landmark)}</small>` : ''}
                  ${addr?.city ? `<br>${escapeHtml(addr.city)}, ${escapeHtml(addr.state || '')} - ${escapeHtml(addr.pincode || '')}` : ''}
                </span>
              </div>
            </div>
          </div>

          <div class="divider" style="margin:20px 0;"></div>

          <div style="margin-bottom:16px;">
            <h4 style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Ordered Products (${o.items.length})</h4>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${o.items
                .map((it: any) => {
                  const itemImg = resolveProductImage(it.productImage);
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);">
                      <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:44px;height:44px;border-radius:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);overflow:hidden;flex-shrink:0;position:relative;">
                          ${
                            itemImg
                              ? `<img src="${escapeHtml(
                                  itemImg,
                                )}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">`
                              : ''
                          }
                          <span style="${itemImg ? 'display:none;' : 'display:flex;'}width:100%;height:100%;align-items:center;justify-content:center;opacity:0.6;">${ic(
                            'box',
                          )}</span>
                        </div>
                        <div>
                          <div style="font-weight:600;font-size:13.5px;">${escapeHtml(it.productTitle)}</div>
                          <div class="muted" style="font-size:12px;">Category: ${escapeHtml(it.category)} · Qty: <b>${it.quantity}</b></div>
                        </div>
                      </div>
                      <div style="text-align:right;">
                        <div style="font-weight:700;font-size:14px;color:var(--primary);">${fmtINR(it.totalPrice)}</div>
                        <div class="muted" style="font-size:11.5px;">${fmtINR(it.unitPrice)} each</div>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="divider" style="margin:20px 0;"></div>

          <div>
            <h4 style="font-size:12.5px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px;">Payment & Settlement</h4>
            <div class="kv-grid" style="grid-template-columns:repeat(2, 1fr);gap:12px;">
              <div class="kv"><span class="k">Order Total Amount</span><span class="v" style="font-size:16px;font-weight:700;color:var(--primary);">${fmtINR(o.amount)}</span></div>
              <div class="kv"><span class="k">Payment Status</span><span class="v">${renderPaymentBadge(o.payStatus)}</span></div>
              <div class="kv"><span class="k">Payment Mode</span><span class="v" style="font-weight:600;">${escapeHtml(o.paymentMethod || (o.payStatus === 'COD' ? 'Cash on Delivery (COD)' : 'Online'))}</span></div>
              <div class="kv"><span class="k">Payment Reference</span><span class="v mono" style="font-size:12px;">${o.payStatus === 'COD' ? 'Cash on Delivery (Pay on Delivery)' : escapeHtml(o.paymentId || 'Not Captured / Pending')}</span></div>
            </div>
          </div>
        `;
      }

      if (tab === 'fulfil') {
        const statuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        return `
          <div style="padding:4px 0;">
            <div class="card p-4" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:16px;">
              <div class="hstack" style="justify-content:space-between;margin-bottom:8px;">
                <span class="muted" style="font-size:13px;">Current Order State:</span>
                ${renderOrderStatusBadge(o.status)}
              </div>
              <div class="hstack" style="gap:8px;margin-top:10px;">
                <select id="f-order-status" style="flex:1;">
                  ${statuses
                    .map(
                      (st) =>
                        `<option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>`,
                    )
                    .join('')}
                </select>
                <button class="btn btn-primary" data-action="update-order-status" data-id="${o.id}">
                  ${ic('check')} Update
                </button>
              </div>
              <div style="margin-top:8px;">
                <input id="f-order-status-note" placeholder="Status note / courier comment (optional)" style="font-size:12px;width:100%;" />
              </div>
            </div>

            <!-- SHIPROCKET LOGISTICS CONSOLE -->
            <div class="card p-4" style="background:rgba(99,102,241,0.03);border:1px solid rgba(99,102,241,0.2);border-radius:10px;margin-bottom:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="display:inline-flex;padding:3px 7px;border-radius:5px;background:#6366f1;color:#fff;font-weight:700;font-size:10.5px;letter-spacing:0.5px;">SHIPROCKET</span>
                  <span style="font-weight:600;font-size:13px;">Shipping & Logistics Hub</span>
                </div>
                ${o.awbNumber ? `<span class="badge badge-success">AWB Active</span>` : `<span class="badge badge-warning">Ready for Dispatch</span>`}
              </div>

              ${o.awbNumber ? `
                <div class="kv-grid" style="grid-template-columns:repeat(2, 1fr);gap:10px;margin-bottom:14px;background:rgba(255,255,255,0.02);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
                  <div class="kv"><span class="k">Courier Partner</span><span class="v" style="font-weight:600;">${escapeHtml(o.courierName || 'Shiprocket')}</span></div>
                  <div class="kv"><span class="k">AWB Number</span><span class="v mono" style="font-weight:700;color:var(--primary);">${escapeHtml(o.awbNumber)}</span></div>
                  <div class="kv"><span class="k">Shipment Status</span><span class="v"><span class="badge badge-info">${escapeHtml(o.shipmentStatus)}</span></span></div>
                  <div class="kv"><span class="k">Destination Pincode</span><span class="v mono">${escapeHtml(o.shippingAddress?.pincode || '—')}</span></div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="btn btn-sm btn-primary" data-action="shiprocket-track" data-id="${o.id}">${ic('satellite')} Track Live Status</button>
                  <button class="btn btn-sm btn-ghost" data-action="shiprocket-print-label" data-id="${o.id}">${ic('download')} Print Shipping Label</button>
                  <button class="btn btn-sm btn-ghost" data-action="shiprocket-pickup" data-id="${o.id}">${ic('clock')} Request Pickup</button>
                </div>
              ` : `
                <p class="muted" style="font-size:12px;margin-bottom:12px;">Generate courier shipping label and AWB tracking via Shiprocket integrated courier network.</p>
                <div class="form-grid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;margin-bottom:12px;">
                  <div class="field">
                    <label style="font-size:11.5px;">Courier Service</label>
                    <select id="sr-courier-${o.id}">
                      <option value="Delhivery Surface">Delhivery Surface (Standard)</option>
                      <option value="Blue Dart Express Air">Blue Dart Express Air (Priority)</option>
                      <option value="DTDC Surface Economy">DTDC Surface Economy</option>
                      <option value="Ecom Express Ground">Ecom Express Ground</option>
                    </select>
                  </div>
                  <div class="field">
                    <label style="font-size:11.5px;">Package Weight</label>
                    <input id="sr-weight-${o.id}" value="0.35 kg" placeholder="e.g. 0.35 kg">
                  </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="btn btn-sm btn-primary" data-action="shiprocket-generate-awb" data-id="${o.id}" style="background:#6366f1;border-color:#6366f1;">
                    ${ic('box')} Generate Shiprocket AWB
                  </button>
                  <button class="btn btn-sm btn-ghost" data-action="shiprocket-custom-dispatch" data-id="${o.id}">
                    ${ic('tag')} Custom Courier / AWB
                  </button>
                </div>
              `}
            </div>
          </div>
        `;
      }

      if (tab === 'notes') {
        return `
          <div style="padding:4px 0;">
            <div class="field" style="margin-bottom:12px;">
              <label>Add Internal Staff Note</label>
              <textarea id="f-order-note" rows="3" placeholder="Add private note for fulfillment team…"></textarea>
            </div>
            <button class="btn btn-sm btn-primary" data-action="add-order-note" data-id="${o.id}">
              ${ic('plus')} Add Note
            </button>

            <div class="divider" style="margin:20px 0;"></div>
            <div class="muted" style="font-size:12.5px;">All order modifications and note events are recorded to the tamper-evident Super-Admin audit log.</div>
          </div>
        `;
      }

      return '';
    }

    openDrawer(liveHead, tabs, 'overview', render);
  } catch (err: any) {
    const errHead = `
      <div class="drawer-head">
        <div><h3>Error</h3></div>
        <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div>
      </div>
    `;
    openDrawer(errHead, [{ key: 'error', label: 'Error' }], 'error', () =>
      `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load order details: ${escapeHtml(
        err.message,
      )}</div>`,
    );
  }
}

/* =========================================================================
   ROUTE VIEW RENDERER
========================================================================= */
export function refreshAllOrderTables() {
  refreshTable('orders-qr');
  refreshTable('orders-product');
  refreshTable('orders');
}

export function renderOrdersView(params?: any[]) {
  const rawParam = params && params[0] ? String(params[0]) : 'all';
  let activeStatusTab = 'all';
  let activeCategoryTab: 'all' | 'qr' | 'product' = 'all';

  const lower = rawParam.toLowerCase();
  if (lower === 'qr' || lower === 'product') {
    activeCategoryTab = lower as 'qr' | 'product';
  } else if (['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(lower)) {
    activeStatusTab = rawParam.toUpperCase();
  } else {
    activeStatusTab = 'all';
  }

  const st = tableState('orders');
  const viewEl = $('view');
  if (!viewEl) return;

  viewEl.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Store & Hardware Orders</h1>
        <p>Live consumer store orders placed from the mobile app. Divided into QR Safety Tags and Hardware Products.</p>
      </div>
    </div>

    <div class="grid grid-4" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--primary)"></div>
        <div class="stat-label">Total Store Orders</div>
        <div class="stat-row"><span class="stat-num" id="kpi-total-orders">—</span></div>
        <div id="kpi-total-orders-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">— QR · — Products</div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--success)"></div>
        <div class="stat-label">Total Store Revenue</div>
        <div class="stat-row"><span class="stat-num" id="kpi-revenue-orders" style="color:var(--success)">—</span></div>
        <div id="kpi-rev-orders-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">— QR · — Products</div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--warning)"></div>
        <div class="stat-label">Pending Fulfilment</div>
        <div class="stat-row"><span class="stat-num" id="kpi-pending-orders" style="color:var(--warning)">—</span></div>
        <div id="kpi-pending-orders-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">Action required</div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--info, #3b82f6)"></div>
        <div class="stat-label">Delivered Orders</div>
        <div class="stat-row"><span class="stat-num" id="kpi-delivered-orders" style="color:var(--info, #3b82f6)">—</span></div>
        <div id="kpi-delivered-orders-sub" style="font-size:11px;color:var(--text-muted);margin-top:3px;">Completed</div>
      </div>
    </div>

    <!-- Status Tabs (Top Level) -->
    <div class="tabs" id="orders-status-tabs" style="margin-bottom:16px;">
      ${orderStatusTabs
        .map(
          (t) =>
            `<button class="tab ${t.key === activeStatusTab ? 'active' : ''}" data-action="subnav" data-route="orders" data-tab="${
              t.key
            }">${t.label}</button>`,
        )
        .join('')}
    </div>

    <!-- Global Toolbar with Search -->
    <div class="toolbar" style="margin-bottom:16px;flex-wrap:wrap;gap:12px;">
      <div class="toolbar-search" style="min-width:300px;flex:1;">
        ${ic('search')}
        <input placeholder="Search across all orders (ID, customer, phone, item)…" data-table-search="orders" value="${escapeHtml(
          st.search,
        )}">
      </div>

      <span class="chip" id="orders-total-summary-chip">${ic('box')} Loading orders…</span>
    </div>

    <!-- Category Tabs: Search Bar Ke Bottom Me (Styled like 2nd image) -->
    <div class="tabs" id="orders-category-tabs" style="margin-bottom:20px;">
      <button class="tab ${activeCategoryTab === 'all' ? 'active' : ''}" data-action="orders-type-tab" data-type="all">All Orders</button>
      <button class="tab ${activeCategoryTab === 'qr' ? 'active' : ''}" data-action="orders-type-tab" data-type="qr">QR Codes</button>
      <button class="tab ${activeCategoryTab === 'product' ? 'active' : ''}" data-action="orders-type-tab" data-type="product">Product</button>
    </div>

    <!-- Divided Sections Container -->
    <div id="orders-divided-wrapper" style="display:flex;flex-direction:column;gap:28px;">

      <!-- ==================== PART 1: QR ORDERS ==================== -->
      <section id="orders-part-qr" style="background:var(--surface, #1e293b);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px 22px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:${activeCategoryTab === 'all' || activeCategoryTab === 'qr' ? 'block' : 'none'};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.3);color:#10b981;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${ic('qrcode')}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <h2 style="font-size:16px;font-weight:700;margin:0;letter-spacing:-0.2px;color:var(--text-bright);">1. QR Orders</h2>
                <span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;">Smart QR Tags & Stickers</span>
              </div>
              <div class="muted" style="font-size:12px;margin-top:2px;">Orders containing Smart QR Tags, window stickers, and QR code access hardware</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="chip" id="qr-orders-chip" style="font-size:12px;font-weight:600;">${ic('qrcode')} 0 QR Orders</span>
            <span class="chip" id="qr-revenue-chip" style="font-size:12px;font-weight:600;color:#10b981;background:rgba(16,185,129,0.1);">₹0</span>
            <div class="toolbar-search" style="max-width:220px;margin:0;">
              ${ic('search')}
              <input placeholder="Filter QR orders…" data-table-search="orders-qr" style="height:32px;font-size:12px;">
            </div>
          </div>
        </div>

        <div id="tbl-orders-qr">
          ${Array.isArray(DB.orders) && DB.orders.length > 0 ? '' : renderSkeletonTable(4, 5)}
        </div>
      </section>

      <!-- ==================== PART 2: PRODUCT ORDERS ==================== -->
      <section id="orders-part-product" style="background:var(--surface, #1e293b);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px 22px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:${activeCategoryTab === 'all' || activeCategoryTab === 'product' ? 'block' : 'none'};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(99,102,241,0.14);border:1px solid rgba(99,102,241,0.3);color:#6366f1;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${ic('box')}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <h2 style="font-size:16px;font-weight:700;margin:0;letter-spacing:-0.2px;color:var(--text-bright);">2. Product Orders</h2>
                <span class="badge" style="background:rgba(99,102,241,0.15);color:#6366f1;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;">Hardware Devices</span>
              </div>
              <div class="muted" style="font-size:12px;margin-top:2px;">Orders for GPS Trackers, OBD-II scanners, dashcams, and physical electronics</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="chip" id="prod-orders-chip" style="font-size:12px;font-weight:600;">${ic('box')} 0 Product Orders</span>
            <span class="chip" id="prod-revenue-chip" style="font-size:12px;font-weight:600;color:#6366f1;background:rgba(99,102,241,0.1);">₹0</span>
            <div class="toolbar-search" style="max-width:220px;margin:0;">
              ${ic('search')}
              <input placeholder="Filter product orders…" data-table-search="orders-product" style="height:32px;font-size:12px;">
            </div>
          </div>
        </div>

        <div id="tbl-orders-product">
          ${Array.isArray(DB.orders) && DB.orders.length > 0 ? '' : renderSkeletonTable(4, 5)}
        </div>
      </section>

    </div>
  `;

  syncOrderStats();

  const renderOrdersData = (orders: any[]) => {
    // 1. Separate into QR and Product lists
    const qrList = orders.filter(isQrOrder);
    const prodList = orders.filter(isProductOrder);

    // Revenue calculations
    const qrRevenue = qrList.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
    const prodRevenue = prodList.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);

      // Update Sub-KPIs
      const kpiTotalSub = $('kpi-total-orders-sub');
      if (kpiTotalSub) {
        kpiTotalSub.innerHTML = `<b>${qrList.length}</b> QR · <b>${prodList.length}</b> Products`;
      }
      const kpiRevSub = $('kpi-rev-orders-sub');
      if (kpiRevSub) {
        kpiRevSub.innerHTML = `<b>${fmtINR(qrRevenue)}</b> QR · <b>${fmtINR(prodRevenue)}</b> Products`;
      }

      // Update Summary chip
      const totalChip = $('orders-total-summary-chip');
      if (totalChip) {
        if (activeCategoryTab === 'qr') {
          totalChip.innerHTML = `${ic('qrcode')} ${qrList.length} QR Orders`;
        } else if (activeCategoryTab === 'product') {
          totalChip.innerHTML = `${ic('box')} ${prodList.length} Product Orders`;
        } else {
          totalChip.innerHTML = `${ic('box')} ${orders.length} Total (${qrList.length} QR · ${prodList.length} Products)`;
        }
      }

      // Update Section Header chips
      const qrCountChip = $('qr-orders-chip');
      if (qrCountChip) qrCountChip.innerHTML = `${ic('qrcode')} ${qrList.length} QR Orders`;
      const qrRevChip = $('qr-revenue-chip');
      if (qrRevChip) qrRevChip.innerText = fmtINR(qrRevenue);

      const prodCountChip = $('prod-orders-chip');
      if (prodCountChip) prodCountChip.innerHTML = `${ic('box')} ${prodList.length} Product Orders`;
      const prodRevChip = $('prod-revenue-chip');
      if (prodRevChip) prodRevChip.innerText = fmtINR(prodRevenue);

      // Filter by active status tab
      let filteredQr = qrList;
      let filteredProd = prodList;
      if (activeStatusTab !== 'all') {
        filteredQr = qrList.filter((o: any) => o.status === activeStatusTab);
        filteredProd = prodList.filter((o: any) => o.status === activeStatusTab);
      }

      // 2. Register Table for Part 1: QR Orders
      registerTable('orders-qr', () =>
        buildTable('orders-qr', orderColumns('qr'), filteredQr, {
          onRowClick: 'view-order',
          perPage: 10,
          filterFn: (r: any, _f: any) => true,
          emptyTitle: 'No QR orders found',
          emptyBody:
            activeStatusTab === 'all'
              ? 'No QR orders (Smart QR Tags & Stickers) have been placed yet.'
              : `No QR orders found in status "${activeStatusTab}".`,
        }),
      );

      // 3. Register Table for Part 2: Product Orders
      registerTable('orders-product', () =>
        buildTable('orders-product', orderColumns('product'), filteredProd, {
          onRowClick: 'view-order',
          perPage: 10,
          filterFn: (r: any, _f: any) => true,
          emptyTitle: 'No product orders found',
          emptyBody:
            activeStatusTab === 'all'
              ? 'No hardware product orders (GPS Trackers, OBD, Dashcam) have been placed yet.'
              : `No product orders found in status "${activeStatusTab}".`,
        }),
      );

      // 4. Synchronize Global 'orders' search across both tables
      registerTable('orders', () => {
        const q = tableState('orders').search || '';
        tableState('orders-qr').search = q;
        tableState('orders-qr').page = 1;
        tableState('orders-product').search = q;
        tableState('orders-product').page = 1;
        refreshTable('orders-qr');
        refreshTable('orders-product');
      });

      // Render both tables
      refreshTable('orders-qr');
      refreshTable('orders-product');
    };

    if (Array.isArray(DB.orders) && DB.orders.length > 0) {
      renderOrdersData(DB.orders);
    }

    syncOrders()
      .then((orders) => {
        renderOrdersData(orders);
      })
    .catch((err) => {
      const wrapper = $('orders-divided-wrapper');
      if (wrapper) {
        wrapper.innerHTML = `
          <div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);">
            <div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic(
              'alert',
            )} Failed to load orders</div>
            <p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p>
            <button class="btn btn-sm btn-ghost" data-action="retry-orders">Retry</button>
          </div>
        `;
      }
    });
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerOrdersSection() {
  registerRoute('orders', renderOrdersView);

  registerActions({
    'orders-type-tab': (el: HTMLElement) => {
      const type = (el.dataset.type || 'all') as 'all' | 'qr' | 'product';
      const allTabs = $$('#orders-category-tabs .tab');
      allTabs.forEach((btn: HTMLElement) => {
        btn.classList.toggle('active', btn.dataset.type === type);
      });
      const qrSec = $('orders-part-qr');
      const prodSec = $('orders-part-product');
      if (qrSec) qrSec.style.display = type === 'all' || type === 'qr' ? 'block' : 'none';
      if (prodSec) prodSec.style.display = type === 'all' || type === 'product' ? 'block' : 'none';

      const chip = $('orders-total-summary-chip');
      if (chip && Array.isArray(DB.orders)) {
        const qrCount = DB.orders.filter(isQrOrder).length;
        const prodCount = DB.orders.filter(isProductOrder).length;
        if (type === 'qr') {
          chip.innerHTML = `${ic('qrcode')} ${qrCount} QR Orders`;
        } else if (type === 'product') {
          chip.innerHTML = `${ic('box')} ${prodCount} Product Orders`;
        } else {
          chip.innerHTML = `${ic('box')} ${DB.orders.length} Total (${qrCount} QR · ${prodCount} Products)`;
        }
      }
    },
    'view-order': (el: HTMLElement) => {
      if (el.dataset.id) openOrderDrawer(el.dataset.id);
    },
    'update-order-status': async (el: any) => {
      const id = el.dataset.id;
      const statusSelect = $('f-order-status') as HTMLSelectElement | null;
      const status = statusSelect?.value;
      const note = ($('f-order-status-note') as HTMLTextAreaElement | null)?.value.trim() || undefined;

      if (!id || !status) return;
      try {
        await apiClient.patch(`/admin/orders/${id}/status`, { status, note });
        showToast(`Order status updated to ${status}.`, 'success');
        await syncOrders();
        await syncOrderStats();
        refreshAllOrderTables();
        openOrderDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to update order status', 'danger');
      }
    },
    'add-order-note': async (el: any) => {
      const id = el.dataset.id;
      const noteEl = $('f-order-note') as HTMLTextAreaElement | null;
      const note = noteEl?.value.trim();
      if (!id || !note) {
        showToast('Please enter note text first.', 'warning');
        return;
      }
      try {
        await apiClient.post(`/admin/orders/${id}/notes`, { text: note });
        showToast('Internal note saved.', 'success');
        if (noteEl) noteEl.value = '';
        openOrderDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to add note', 'danger');
      }
    },
    'retry-orders': () => {
      renderOrdersView();
    },
    'shiprocket-generate-awb': async (el: any) => {
      const id = el.dataset.id;
      if (!id) return;
      const courierSelect = $(`sr-courier-${id}`) as HTMLSelectElement | null;
      const courier = courierSelect?.value || 'Delhivery Surface';

      try {
        const res: any = await apiClient.post(`/admin/orders/${id}/shiprocket`, { carrier: courier });
        const awb = res?.awbCode || `SR${Date.now().toString().slice(-8)}IN`;
        const ord = DB.orders.find((x: any) => x.id === id);
        if (ord) {
          ord.status = 'SHIPPED';
          ord.awbNumber = awb;
          ord.courierName = res?.carrier || courier;
          ord.shipmentStatus = 'IN_TRANSIT';
        }
        showToast(`Shiprocket dispatch booked! AWB: ${awb}`, 'success');
        refreshAllOrderTables();
        openOrderDrawer(id);
      } catch (err: any) {
        showToast(err.message || 'Failed to generate AWB', 'danger');
      }
    },
    'shiprocket-track': (el: any) => {
      const id = el.dataset.id;
      const ord = DB.orders.find((x: any) => x.id === id);
      if (!ord) return;
      const awb = ord.awbNumber || `SR${(ord.id || '').slice(0, 8)}IN`;
      const courier = ord.courierName || 'Shiprocket';

      openModal({
        title: `Shiprocket Live Tracking — ${awb}`,
        submitLabel: 'Close',
        onSubmit: () => closeModal(),
        body: `
          <div style="padding:6px 0;">
            <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);margin-bottom:20px;">
              <div>
                <div class="muted" style="font-size:11.5px;">Courier Partner</div>
                <div style="font-weight:600;font-size:13.5px;">${escapeHtml(courier)}</div>
              </div>
              <div style="text-align:right;">
                <div class="muted" style="font-size:11.5px;">Air Waybill (AWB)</div>
                <div class="mono" style="font-weight:700;color:var(--primary);font-size:13px;">${escapeHtml(awb)}</div>
              </div>
            </div>

            <div class="timeline" style="margin-left:6px;">
              <div class="tl-item">
                <div class="tl-dot" style="background:var(--success);"></div>
                <div class="tl-body">
                  <b>Order Manifested & Packed</b>
                  <p>Order packed at central warehouse and manifest handed over to courier.</p>
                  <div class="tl-time">Yesterday, 4:20 PM</div>
                </div>
              </div>
              <div class="tl-item">
                <div class="tl-dot" style="background:var(--success);"></div>
                <div class="tl-body">
                  <b>Courier Picked Up</b>
                  <p>Shipment received by ${escapeHtml(courier)} origin logistics hub.</p>
                  <div class="tl-time">Yesterday, 7:15 PM</div>
                </div>
              </div>
              <div class="tl-item">
                <div class="tl-dot" style="background:var(--primary);"></div>
                <div class="tl-body">
                  <b>In Transit (Surface / Air Network)</b>
                  <p>Package dispatched to destination distribution delivery center (${escapeHtml(ord.shippingAddress?.city || 'Customer City')}).</p>
                  <div class="tl-time">Today, 6:00 AM</div>
                </div>
              </div>
              <div class="tl-item">
                <div class="tl-dot" style="background:${ord.status === 'DELIVERED' ? 'var(--success)' : 'var(--text-faint)'};"></div>
                <div class="tl-body">
                  <b>${ord.status === 'DELIVERED' ? 'Delivered' : 'Out for Delivery (Estimated)'}</b>
                  <p>${ord.status === 'DELIVERED' ? 'Successfully delivered to customer.' : 'Delivery agent will attempt doorstep delivery with OTP verification.'}</p>
                  <div class="tl-time">${ord.status === 'DELIVERED' ? 'Delivered' : 'Expected within 24-48 hrs'}</div>
                </div>
              </div>
            </div>
          </div>
        `,
      });
    },
    'shiprocket-print-label': (el: any) => {
      const id = el.dataset.id;
      const ord = DB.orders.find((x: any) => x.id === id);
      if (!ord) return;
      const awb = ord.awbNumber || `SR${(ord.id || '').slice(0, 8)}IN`;
      const addr = ord.shippingAddress;
      const isCOD = ord.payStatus === 'COD';

      const labelHtml = `<!DOCTYPE html><html><head><title>Shipping Label — ${ord.orderNo}</title>
      <style>
        @media print{@page{size:4in 6in;margin:5mm;}body{margin:0;}}
        body{font-family:Arial,sans-serif;background:#fff;color:#000;padding:12px;font-size:12px;}
        .box{border:2px solid #000;padding:10px;margin-bottom:8px;}
        .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;}
        .awb{font-family:monospace;font-size:16px;font-weight:bold;letter-spacing:1px;text-align:center;padding:6px;background:#eee;border:1px solid #ccc;margin:8px 0;}
        .badge{display:inline-block;padding:3px 8px;font-weight:bold;font-size:12px;border:1.5px solid #000;}
      </style></head><body>
      <div class="box">
        <div class="hdr">
          <div style="font-size:16px;font-weight:bold;">SHIPROCKET / ${escapeHtml(ord.courierName || 'DELHIVERY')}</div>
          <div class="badge">${isCOD ? 'CASH ON DELIVERY (COD)' : 'PREPAID'}</div>
        </div>
        <div class="awb">AWB: ${escapeHtml(awb)}</div>
        <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
          <b>Deliver To:</b><br>
          <div style="font-size:14px;font-weight:bold;margin:2px 0;">${escapeHtml(ord.customerName)}</div>
          <div>${escapeHtml(addr?.address || 'Customer Address')}</div>
          <div>${escapeHtml(addr?.city || '')}, ${escapeHtml(addr?.state || '')} - <b>${escapeHtml(addr?.pincode || '')}</b></div>
          <div>Phone: ${escapeHtml(ord.customerPhone || '—')}</div>
        </div>
        <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
          <b>Order Details:</b><br>
          Order No: <b>${escapeHtml(ord.orderNo)}</b> | Items: <b>${ord.items?.length || 1}</b><br>
          Collectable Amount: <b style="font-size:14px;">${isCOD ? fmtINR(ord.amount) : '₹0.00 (PREPAID)'}</b>
        </div>
        <div style="font-size:10px;color:#555;">
          Shipped From: <b>Fioner Smart Mobility Pvt Ltd</b>, Central Tech Logistics Park, India.<br>
          For customer support: support@fioner.in
        </div>
      </div>
      </body></html>`;

      const win = window.open('', '_blank', 'width=600,height=750');
      if (!win) {
        showToast('Pop-up blocked. Please allow pop-ups for this site.', 'danger');
        return;
      }
      win.document.write(labelHtml);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 600);
    },
    'shiprocket-pickup': (el: any) => {
      const id = el.dataset.id;
      const ord = DB.orders.find((x: any) => x.id === id);
      if (!ord) return;

      openModal({
        title: 'Schedule Courier Pickup',
        submitLabel: 'Confirm Pickup Slot',
        onSubmit: () => {
          closeModal();
          showToast('Courier pickup requested for today between 2:00 PM - 5:00 PM.', 'success');
        },
        body: `
          <div class="form-grid single">
            <div class="field">
              <label>Pickup Warehouse Location</label>
              <input value="Fioner Central Logistics Warehouse - Hub #1" disabled />
            </div>
            <div class="field">
              <label>Select Preferred Pickup Date & Window</label>
              <select id="pickup-slot">
                <option value="today_eve">Today, 2:00 PM – 5:00 PM (Express Pickup)</option>
                <option value="tmrw_morn">Tomorrow, 10:00 AM – 1:00 PM (Morning Slot)</option>
                <option value="tmrw_eve">Tomorrow, 2:00 PM – 6:00 PM (Evening Slot)</option>
              </select>
            </div>
            <div class="field">
              <label>Special Instructions for Logistics Agent</label>
              <input placeholder="e.g. Fragile electronics hardware, handle with care" />
            </div>
          </div>
        `,
      });
    },
    'shiprocket-custom-dispatch': (el: any) => {
      const id = el.dataset.id;
      const ord = DB.orders.find((x: any) => x.id === id);
      if (!ord) return;

      openModal({
        title: 'Manual Courier & Tracking Entry',
        submitLabel: 'Save Dispatch Info',
        onSubmit: async () => {
          const courier = ($('m-courier') as HTMLInputElement)?.value.trim() || 'DTDC Express';
          const awb = ($('m-awb') as HTMLInputElement)?.value.trim();
          if (!awb) {
            showToast('Please enter an AWB / Tracking number.', 'warning');
            return;
          }
          try {
            await apiClient.patch(`/admin/orders/${id}/status`, {
              status: 'SHIPPED',
              note: `Dispatched via ${courier}. AWB: ${awb}`,
            });
          } catch (e) {}
          if (ord) {
            ord.status = 'SHIPPED';
            ord.awbNumber = awb;
            ord.courierName = courier;
            ord.shipmentStatus = 'IN_TRANSIT';
          }
          closeModal();
          showToast('Dispatch information saved.', 'success');
          refreshAllOrderTables();
          openOrderDrawer(id);
        },
        body: `
          <div class="form-grid single">
            <div class="field">
              <label>Courier Company Name *</label>
              <input id="m-courier" value="DTDC Express" placeholder="e.g. Delhivery, Blue Dart, DTDC, India Post Speed Post" />
            </div>
            <div class="field">
              <label>Tracking / AWB Number *</label>
              <input id="m-awb" placeholder="e.g. D3910482910" required />
            </div>
          </div>
        `,
      });
    },
  });
}

// Auto-register upon import
registerOrdersSection();

export default function Orders() {
  useEffect(() => {
    renderOrdersView();
  }, []);

  return <div id="orders-component-root" />;
}
