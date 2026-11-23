'use client';

import React, { useEffect } from 'react';
import {
  $,
  ic,
  escapeHtml,
  fmtINR,
  statusBadge,
  renderEmpty,
  renderSkeletonTable,
  openDrawer,
  openModal,
  closeModal,
  showToast,
  afterMutation,
  mountAnimations,
  tableState,
  registerTable,
  refreshTable,
  buildTable,
  apiClient,
  DB,
  state,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export const inventoryTabs = [
  { key: 'all', label: 'All Products' },
  { key: 'in_stock', label: 'In Stock' },
  { key: 'out_of_stock', label: 'Out of Stock' },
  { key: 'on_sale', label: 'On Sale / Deals' },
];

export const productCategories = [
  'OBD',
  'GPS Tracker',
  'Dashcam',
  'Smart QR Tag',
  'Accessories',
  'Car Care',
  'General',
];

/* =========================================================================
   ENTITY MAPPER
========================================================================= */
export function mapProductFromApi(p: any) {
  if (!p) return null;
  const price = Number(p.price || 0);
  const originalPrice = Number(p.originalPrice || price);
  const discountPercent =
    p.discountPercent !== undefined && p.discountPercent !== null
      ? Number(p.discountPercent)
      : originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return {
    id: p.id,
    title: p.title || p.name || 'Untitled Product',
    name: p.title || p.name || 'Untitled Product',
    subtitle: p.subtitle || '',
    category: p.category || 'Accessories',
    price,
    originalPrice,
    discountPercent,
    rating: typeof p.rating === 'number' ? p.rating : parseFloat(p.rating) || 4.5,
    ratingCount: p.ratingCount ? String(p.ratingCount) : '100+',
    deliveryDate: p.deliveryDate || '2-4 business days',
    image: p.image || 'assets/homescreensicons/obd_dongle.png',
    galleryImages: Array.isArray(p.galleryImages)
      ? p.galleryImages
      : [p.image || 'assets/homescreensicons/obd_dongle.png'],
    inStock: p.inStock !== false,
    onSale: !!p.onSale,
    sku: p.sku || `SKU-${(p.id || '').slice(0, 8).toUpperCase()}`,
    stockQuantity: typeof p.stockQuantity === 'number' ? p.stockQuantity : (p.inStock ? 48 : 0),
    reservedQuantity: typeof p.reservedQuantity === 'number' ? p.reservedQuantity : 2,
    availableQuantity: typeof p.availableQuantity === 'number' ? p.availableQuantity : Math.max(0, (p.stockQuantity ?? (p.inStock ? 48 : 0)) - (p.reservedQuantity ?? 2)),
    warehouseLocation: p.warehouseLocation || 'Indore Central Logistics Hub - Rack A1',
    serials: Array.isArray(p.serials) ? p.serials : [],
    fullDescription: p.fullDescription || p.description || '',
    raw: p,
  };
}

/* =========================================================================
   SERVER SYNCHRONIZER
========================================================================= */
export async function syncProducts(query: any = {}) {
  if (!apiClient.getToken()) return DB.products || [];
  const res: any = await apiClient.get('/admin/inventory/products', {
    page: 1,
    limit: 100,
    ...query,
  });
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.products = rawItems.map(mapProductFromApi).filter(Boolean);
  return DB.products;
}

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

/* =========================================================================
   COLUMNS & TABLE
========================================================================= */
export function productColumns() {
  return [
    {
      key: 'title',
      label: 'Product',
      sortable: true,
      render: (r: any) => {
        const imgSrc = resolveProductImage(r.image);
        return `
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;position:relative;">
            ${
              imgSrc
                ? `<img src="${escapeHtml(
                    imgSrc,
                  )}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">`
                : ''
            }
            <span style="${imgSrc ? 'display:none;' : 'display:flex;'}width:100%;height:100%;align-items:center;justify-content:center;opacity:0.6;">${ic(
              'package',
            )}</span>
          </div>
          <div>
            <div class="cell-primary" style="font-weight:600;">${escapeHtml(r.title)}</div>
            <div class="cell-sub" style="font-size:12px;opacity:0.75;">${escapeHtml(r.subtitle || r.category)}</div>
            <div class="mono faint" style="font-size:10.5px;letter-spacing:0.5px;">${escapeHtml(r.sku || '')}</div>
          </div>
        </div>
      `;
      },
    },
    {
      key: 'stockQuantity',
      label: 'Warehouse Stock',
      sortable: true,
      render: (r: any) => `
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="badge ${r.availableQuantity > 5 ? 'badge-success' : (r.availableQuantity > 0 ? 'badge-warning' : 'badge-danger')}" style="font-weight:700;">
              ${r.availableQuantity ?? (r.inStock ? 48 : 0)} Avail
            </span>
            <span class="badge badge-neutral" style="font-size:10.5px;">
              ${r.reservedQuantity ?? 2} Rsvd
            </span>
          </div>
          <div class="muted cell-sub" style="font-size:11px;margin-top:2px;">
            ${escapeHtml(r.warehouseLocation || 'Indore Central WH')}
          </div>
        </div>
      `,
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (r: any) => `<span class="badge badge-info">${escapeHtml(r.category)}</span>`,
    },
    {
      key: 'price',
      label: 'Price (₹)',
      sortable: true,
      align: 'right',
      render: (r: any) => `
        <div>
          <div style="font-weight:700;">${fmtINR(r.price)}</div>
          ${
            r.originalPrice > r.price
              ? `<div style="font-size:11px;opacity:0.7;display:flex;align-items:center;justify-content:flex-end;gap:4px;">
                  <del>${fmtINR(r.originalPrice)}</del>
                  <span class="badge badge-success" style="padding:1px 4px;font-size:10px;">${r.discountPercent}% OFF</span>
                </div>`
              : ''
          }
        </div>
      `,
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (r: any) => `
        <div style="display:flex;align-items:center;gap:4px;font-size:12.5px;">
          <span style="color:#f59e0b;">★</span>
          <span style="font-weight:600;">${r.rating.toFixed(1)}</span>
          <span class="muted" style="font-size:11px;">(${escapeHtml(r.ratingCount)})</span>
        </div>
      `,
    },
    {
      key: 'deliveryDate',
      label: 'Delivery',
      sortable: false,
      render: (r: any) => `<span style="font-size:12.5px;">${escapeHtml(r.deliveryDate)}</span>`,
    },
    {
      key: 'inStock',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (r: any) => `
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
          <span class="badge ${r.inStock ? 'badge-success' : 'badge-danger'}">
            ${r.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
          ${r.onSale ? '<span class="badge badge-warning" style="font-size:10.5px;">Deal</span>' : ''}
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
          <button class="btn-icon btn-sm" data-action="toggle-stock" data-id="${r.id}" title="${
        r.inStock ? 'Set Out of Stock' : 'Set In Stock'
      }" style="cursor:pointer;">
            ${ic(r.inStock ? 'check' : 'x')}
          </button>
          <button class="btn-icon btn-sm" data-action="open-edit-product" data-id="${r.id}" title="Edit Product" style="cursor:pointer;">
            ${ic('pencil')}
          </button>
          <button class="btn-icon btn-sm" data-action="delete-product" data-id="${r.id}" title="Delete Product" style="cursor:pointer;color:var(--danger);">
            ${ic('trash')}
          </button>
        </div>
      `,
    },
  ];
}

/* =========================================================================
   SERIAL & IMEI INVENTORY TRACKING HELPERS
========================================================================= */
export interface SerialUnit {
  serial: string;
  imei?: string;
  status: 'available' | 'allocated' | 'defective';
  allocatedTo?: string;
  addedAt: number;
}

export function getProductSerials(productId: string): SerialUnit[] {
  if (typeof window === 'undefined') return [];
  const key = `fioner_inv_serials_${productId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  const cleanId = (productId || 'PRD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const initial: SerialUnit[] = [
    { serial: `SN-${cleanId}-101`, imei: `86492004${cleanId}01`, status: 'available', addedAt: Date.now() - 86400000 * 5 },
    { serial: `SN-${cleanId}-102`, imei: `86492004${cleanId}02`, status: 'available', addedAt: Date.now() - 86400000 * 5 },
    { serial: `SN-${cleanId}-103`, imei: `86492004${cleanId}03`, status: 'allocated', allocatedTo: 'ORD-84A12F', addedAt: Date.now() - 86400000 * 4 },
    { serial: `SN-${cleanId}-104`, imei: `86492004${cleanId}04`, status: 'available', addedAt: Date.now() - 86400000 * 3 },
    { serial: `SN-${cleanId}-105`, imei: `86492004${cleanId}05`, status: 'available', addedAt: Date.now() - 86400000 * 2 },
  ];
  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

export function saveProductSerials(productId: string, units: SerialUnit[]) {
  if (typeof window === 'undefined') return;
  const key = `fioner_inv_serials_${productId}`;
  try {
    localStorage.setItem(key, JSON.stringify(units));
  } catch (e) {}
}

/* =========================================================================
   DRAWER & MODAL
========================================================================= */
export async function openProductDrawer(id: string) {
  const head = `<div class="drawer-head"><div><h3>Product Details</h3><div class="muted mono" style="font-size:12.5px;margin-top:2px;">Loading…</div></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
  openDrawer(head, [{ key: 'overview', label: 'Overview' }], 'overview', () => '<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading product data…</div>');

  try {
    const pRaw: any = await apiClient.get(`/admin/inventory/products/${id}`);
    const p = mapProductFromApi(pRaw);
    if (!p) throw new Error('Product not found');

    const pImgSrc = resolveProductImage(p.image);
    const liveHead = `
      <div class="drawer-head">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,0.05);overflow:hidden;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;position:relative;">
            ${
              pImgSrc
                ? `<img src="${escapeHtml(
                    pImgSrc,
                  )}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">`
                : ''
            }
            <span style="${pImgSrc ? 'display:none;' : 'display:flex;'}width:100%;height:100%;align-items:center;justify-content:center;opacity:0.6;">${ic(
              'package',
            )}</span>
          </div>
          <div>
            <h3 style="margin:0;font-size:16px;">${escapeHtml(p.title)}</h3>
            <div class="muted" style="font-size:12px;margin-top:2px;">${escapeHtml(p.subtitle || p.category)}</div>
          </div>
        </div>
        <div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div>
      </div>
    `;

    const tabs = [
      { key: 'overview', label: 'Overview & Details' },
      { key: 'serials', label: 'Serial & IMEI Inventory' },
    ];

    function render(tab: string = 'overview') {
      if (tab === 'serials') {
        const units = Array.isArray(p.serials) && p.serials.length > 0 ? p.serials : getProductSerials(p.id);
        const availCount = units.filter((u: any) => u.status === 'available').length;
        const allocCount = units.filter((u: any) => u.status === 'allocated').length;
        const defCount = units.filter((u: any) => u.status === 'defective').length;

        return `
          <div style="padding:4px 0;">
            <div class="grid grid-3" style="margin-bottom:16px;">
              <div class="stat-card" style="padding:10px 14px;">
                <div class="stat-label" style="font-size:11px;">In Stock (Available)</div>
                <div class="stat-num" style="font-size:18px;color:var(--success);font-weight:700;">${availCount}</div>
              </div>
              <div class="stat-card" style="padding:10px 14px;">
                <div class="stat-label" style="font-size:11px;">Allocated / Dispatched</div>
                <div class="stat-num" style="font-size:18px;color:var(--primary);font-weight:700;">${allocCount}</div>
              </div>
              <div class="stat-card" style="padding:10px 14px;">
                <div class="stat-label" style="font-size:11px;">Defective / RMA</div>
                <div class="stat-num" style="font-size:18px;color:var(--danger);font-weight:700;">${defCount}</div>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:13px;font-weight:600;">Hardware Unit Registry (${units.length} units)</div>
              <button class="btn btn-sm btn-primary" data-action="open-add-serials" data-id="${p.id}">
                ${ic('plus')} Register Units
              </button>
            </div>

            ${
              units.length === 0
                ? renderEmpty('No units registered', 'Click Register Units to add serial numbers and IMEIs.', 'archive')
                : `
              <div class="table-wrap">
                <table class="dtable" style="font-size:12px;">
                  <thead>
                    <tr>
                      <th>Serial Number</th>
                      <th>IMEI / Identifier</th>
                      <th>Status</th>
                      <th>Allocation</th>
                      <th class="ta-r">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${units
                      .map(
                        (u, idx) => `
                      <tr>
                        <td><span class="mono" style="font-weight:600;">${escapeHtml(u.serial)}</span></td>
                        <td><span class="mono muted">${escapeHtml(u.imei || '—')}</span></td>
                        <td>
                          <span class="badge ${
                            u.status === 'available'
                              ? 'badge-success'
                              : u.status === 'allocated'
                              ? 'badge-info'
                              : 'badge-danger'
                          }" style="text-transform:capitalize;">
                            ${escapeHtml(u.status)}
                          </span>
                        </td>
                        <td><span class="mono" style="font-size:11.5px;">${escapeHtml(u.allocatedTo || 'Available in Stock')}</span></td>
                        <td class="ta-r">
                          <button class="btn-icon btn-sm" data-action="toggle-serial-status" data-id="${p.id}" data-idx="${idx}" title="Cycle Status: Available / Allocated / Defective">
                            ${ic('refresh')}
                          </button>
                          <button class="btn-icon btn-sm" data-action="delete-serial-unit" data-id="${p.id}" data-idx="${idx}" title="Remove Unit" style="color:var(--danger);">
                            ${ic('trash')}
                          </button>
                        </td>
                      </tr>
                    `,
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
            }
          </div>
        `;
      }

      return `
        <div class="kv-grid" style="grid-template-columns: repeat(2, 1fr); gap:12px;">
          <div class="kv"><span class="k">Category</span><span class="v"><span class="badge badge-info">${escapeHtml(p.category)}</span></span></div>
          <div class="kv"><span class="k">Selling Price</span><span class="v" style="font-weight:700;color:var(--primary);">${fmtINR(p.price)}</span></div>
          <div class="kv"><span class="k">Original MRP</span><span class="v"><del>${fmtINR(p.originalPrice)}</del></span></div>
          <div class="kv"><span class="k">Discount</span><span class="v"><span class="badge badge-success">${p.discountPercent}% OFF</span></span></div>
          <div class="kv"><span class="k">Stock Status</span><span class="v"><span class="badge ${p.inStock ? 'badge-success' : 'badge-danger'}">${p.inStock ? 'In Stock (Live in App)' : 'Out of Stock'}</span></span></div>
          <div class="kv"><span class="k">Promotion</span><span class="v">${p.onSale ? '<span class="badge badge-warning">On Sale / Deal</span>' : 'Standard'}</span></div>
          <div class="kv"><span class="k">Customer Rating</span><span class="v" style="color:#f59e0b;">★ ${p.rating.toFixed(1)} (${escapeHtml(p.ratingCount)} reviews)</span></div>
          <div class="kv"><span class="k">Delivery Time</span><span class="v">${escapeHtml(p.deliveryDate)}</span></div>
        </div>

        <div class="divider" style="margin:20px 0;"></div>

        <div style="margin-bottom:18px;">
          <h4 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;">Full Description</h4>
          <p style="font-size:13.5px;line-height:1.6;color:var(--text-normal);background:rgba(255,255,255,0.02);padding:14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);white-space:pre-wrap;">${escapeHtml(p.fullDescription || 'No description provided.')}</p>
        </div>

        <div class="divider" style="margin:20px 0;"></div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" data-action="open-edit-product" data-id="${p.id}">${ic('pencil')} Edit Product</button>
          <button class="btn btn-sm btn-ghost" data-action="toggle-stock" data-id="${p.id}">${ic('refresh')} Toggle Stock Status</button>
          <button class="btn btn-sm btn-ghost" data-action="delete-product" data-id="${p.id}" style="color:var(--danger);">${ic('trash')} Delete Product</button>
        </div>
      `;
    }

    openDrawer(liveHead, tabs, 'overview', render);
  } catch (err: any) {
    const errHead = `<div class="drawer-head"><div><h3>Error</h3></div><div class="drawer-head-actions"><button class="btn-icon" data-action="close-drawer">${ic('x')}</button></div></div>`;
    openDrawer(errHead, [{ key: 'error', label: 'Error' }], 'error', () => `<div class="p-6 text-danger" style="padding:24px;color:var(--danger);">${ic('alert')} Failed to load product: ${escapeHtml(err.message)}</div>`);
  }
}

export function openProductModal(existing?: any) {
  const isEdit = !!existing;
  const categories = [...new Set([...productCategories, existing?.category].filter(Boolean))];

  openModal({
    title: isEdit ? 'Edit Product' : 'Add New Product to Store & Inventory',
    submitLabel: isEdit ? 'Save Changes' : 'Add Product',
    body: `
      <div class="form-grid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:14px;">
        <div class="field full" style="grid-column:span 2;">
          <label>Product Title / Name *</label>
          <input id="f-ptitle" value="${isEdit ? escapeHtml(existing.title) : ''}" placeholder="e.g. JioMotive OBD GPS Tracker" required>
        </div>
        <div class="field full" style="grid-column:span 2;">
          <label>Subtitle / Key Feature</label>
          <input id="f-psubtitle" value="${isEdit ? escapeHtml(existing.subtitle) : ''}" placeholder="e.g. 4G eSIM Plug n Play">
        </div>
        <div class="field">
          <label>Category *</label>
          <select id="f-pcategory">
            ${categories
              .map(
                (c) =>
                  `<option value="${escapeHtml(c)}" ${isEdit && existing.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label>Selling Price (₹) *</label>
          <input id="f-pprice" type="number" min="0" value="${isEdit ? existing.price : ''}" placeholder="e.g. 4999" required>
        </div>
        <div class="field">
          <label>Original Price / MRP (₹)</label>
          <input id="f-poriginalPrice" type="number" min="0" value="${isEdit ? existing.originalPrice : ''}" placeholder="e.g. 6999">
        </div>
        <div class="field">
          <label>Discount (%)</label>
          <input id="f-pdiscount" type="number" min="0" max="100" value="${isEdit ? existing.discountPercent : ''}" placeholder="Auto-computed if empty">
        </div>
        <div class="field">
          <label>Customer Rating (1.0 - 5.0)</label>
          <input id="f-prating" type="number" step="0.1" min="1" max="5" value="${isEdit ? existing.rating : '4.7'}">
        </div>
        <div class="field">
          <label>Rating Count</label>
          <input id="f-pratingCount" value="${isEdit ? escapeHtml(existing.ratingCount) : '1.2K'}" placeholder="e.g. 1.2K">
        </div>
        <div class="field">
          <label>Estimated Delivery Time</label>
          <input id="f-pdelivery" value="${isEdit ? escapeHtml(existing.deliveryDate) : '2-4 business days'}" placeholder="e.g. Sat, 26 Sep">
        </div>
        <div class="field">
          <label>Image URL / Asset Path</label>
          <input id="f-pimage" value="${isEdit ? escapeHtml(existing.image) : 'assets/homescreensicons/obd_dongle.png'}" placeholder="e.g. assets/homescreensicons/obd_dongle.png">
        </div>
        <div class="field">
          <label>Inventory SKU Code</label>
          <input id="f-psku" value="${isEdit ? escapeHtml(existing.sku || '') : ''}" placeholder="e.g. FION-OBD-01">
        </div>
        <div class="field">
          <label>Warehouse Physical Stock Count</label>
          <input id="f-pstockqty" type="number" min="0" value="${isEdit ? (existing.stockQuantity ?? 50) : '50'}" placeholder="e.g. 50">
        </div>
        <div class="field">
          <label>Reserved Stock Units</label>
          <input id="f-preservedqty" type="number" min="0" value="${isEdit ? (existing.reservedQuantity ?? 0) : '0'}" placeholder="e.g. 2">
        </div>
        <div class="field">
          <label>Warehouse Location / Bin</label>
          <input id="f-pwhlocation" value="${isEdit ? escapeHtml(existing.warehouseLocation || 'Indore Central Logistics Hub - Rack A1') : 'Indore Central Logistics Hub - Rack A1'}" placeholder="e.g. Rack A1 - Bin 4">
        </div>
        <div class="field" style="display:flex;align-items:center;padding-top:10px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input id="f-pinstock" type="checkbox" ${!isEdit || existing.inStock ? 'checked' : ''} style="width:18px;height:18px;">
            <span><b>In Stock</b> (Available in mobile store)</span>
          </label>
        </div>
        <div class="field" style="display:flex;align-items:center;padding-top:10px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input id="f-ponsale" type="checkbox" ${isEdit && existing.onSale ? 'checked' : ''} style="width:18px;height:18px;">
            <span><b>On Sale</b> (Highlight deal badge)</span>
          </label>
        </div>
        <div class="field full" style="grid-column:span 2;">
          <label>Full Product Description</label>
          <textarea id="f-pdesc" rows="3" placeholder="Provide detailed product specs, features, and warranty...">${isEdit ? escapeHtml(existing.fullDescription) : ''}</textarea>
        </div>
      </div>
    `,
    onSubmit: async () => {
      const titleInput = $('f-ptitle') as HTMLInputElement | null;
      const priceInput = $('f-pprice') as HTMLInputElement | null;

      const title = titleInput?.value.trim() || '';
      if (!title) {
        showToast('Product title is required', 'warning');
        return;
      }

      const price = parseFloat(priceInput?.value || '0');
      if (isNaN(price) || price < 0) {
        showToast('Valid price is required', 'warning');
        return;
      }

      const subtitle = ($('f-psubtitle') as HTMLInputElement)?.value.trim() || '';
      const category = ($('f-pcategory') as HTMLSelectElement)?.value || 'General';
      const originalPriceRaw = parseFloat(($('f-poriginalPrice') as HTMLInputElement)?.value || '0');
      const originalPrice = !isNaN(originalPriceRaw) && originalPriceRaw > 0 ? originalPriceRaw : price;

      const discountRaw = parseInt(($('f-pdiscount') as HTMLInputElement)?.value || '');
      const discountPercent = !isNaN(discountRaw)
        ? discountRaw
        : originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

      const rating = parseFloat(($('f-prating') as HTMLInputElement)?.value || '4.5') || 4.5;
      const ratingCount = ($('f-pratingCount') as HTMLInputElement)?.value.trim() || '100+';
      const deliveryDate = ($('f-pdelivery') as HTMLInputElement)?.value.trim() || '2-4 business days';
      const image = ($('f-pimage') as HTMLInputElement)?.value.trim() || 'assets/homescreensicons/obd_dongle.png';
      const inStock = ($('f-pinstock') as HTMLInputElement)?.checked ?? true;
      const onSale = ($('f-ponsale') as HTMLInputElement)?.checked ?? false;
      const fullDescription = ($('f-pdesc') as HTMLTextAreaElement)?.value.trim() || '';
      const sku = ($('f-psku') as HTMLInputElement)?.value.trim() || '';
      const stockQuantity = parseInt(($('f-pstockqty') as HTMLInputElement)?.value || '50', 10);
      const reservedQuantity = parseInt(($('f-preservedqty') as HTMLInputElement)?.value || '0', 10);
      const warehouseLocation = ($('f-pwhlocation') as HTMLInputElement)?.value.trim() || 'Indore Central Logistics Hub';

      const payload = {
        title,
        subtitle,
        category,
        price,
        originalPrice,
        discountPercent,
        rating,
        ratingCount,
        deliveryDate,
        image,
        galleryImages: [image],
        inStock,
        onSale,
        fullDescription,
      };

      try {
        let savedId = existing?.id;
        if (isEdit) {
          await apiClient.put(`/admin/inventory/products/${existing.id}`, payload);
        } else {
          const res: any = await apiClient.post('/admin/inventory/products', payload);
          savedId = res?.id || res?.data?.id;
        }

        if (savedId) {
          await apiClient.post(`/admin/inventory/products/${savedId}/adjust`, {
            sku: sku || undefined,
            stockQuantity,
            reservedQuantity,
            warehouseLocation,
          });
        }

        await syncProducts();
        closeModal();
        afterMutation(isEdit ? 'Product & stock updated successfully.' : 'New product added to store & warehouse inventory.');
      } catch (err: any) {
        showToast(err.message || 'Failed to save product', 'danger');
      }
    },
  });
}

/* =========================================================================
   TABS & ROUTE VIEW RENDERER
========================================================================= */
export async function renderInventoryTab(tab: string) {
  const body = $('inv-body');
  if (!body) return;
  const st = tableState('products');
  const hasCachedData = Array.isArray(DB.products) && DB.products.length > 0;

  body.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-search">
        ${ic('search')}
        <input placeholder="Search product name, category…" data-table-search="products" value="${escapeHtml(
          st.search,
        )}">
      </div>
      <select data-table-filter="products" data-filter-key="category">
        <option value="">All categories</option>
        ${productCategories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
      </select>
      <div class="spacer"></div>
      <span class="chip" id="products-count-chip">${ic('archive')} Loading…</span>
    </div>
    <div id="tbl-products">
      ${hasCachedData ? '' : renderSkeletonTable(6, 6)}
    </div>
  `;

  const renderProductsData = (products: any[]) => {
    // Calculate KPI metrics
    const totalCount = products.length;
    const inStockCount = products.filter((p: any) => p.inStock).length;
    const outOfStockCount = totalCount - inStockCount;
    const onSaleCount = products.filter((p: any) => p.onSale).length;

    // Update Top KPI Cards if elements exist
    const kpiTotal = $('kpi-total-products');
    if (kpiTotal) kpiTotal.innerText = String(totalCount);
    const kpiInStock = $('kpi-instock-products');
    if (kpiInStock) kpiInStock.innerText = String(inStockCount);
    const kpiOutOfStock = $('kpi-outofstock-products');
    if (kpiOutOfStock) kpiOutOfStock.innerText = String(outOfStockCount);
    const kpiOnSale = $('kpi-onsale-products');
    if (kpiOnSale) kpiOnSale.innerText = String(onSaleCount);

    const chip = $('products-count-chip');
    if (chip) chip.innerHTML = `${ic('archive')} ${totalCount} Products`;

    // Filter products based on active tab
    let filteredProducts = products;
    if (tab === 'in_stock') {
      filteredProducts = products.filter((p: any) => p.inStock);
    } else if (tab === 'out_of_stock') {
      filteredProducts = products.filter((p: any) => !p.inStock);
    } else if (tab === 'on_sale') {
      filteredProducts = products.filter((p: any) => p.onSale);
    }

    registerTable('products', () =>
      buildTable('products', productColumns(), filteredProducts, {
        onRowClick: 'view-product',
        perPage: 10,
        filterFn: (r: any, f: any) => !f.category || r.category.toLowerCase() === f.category.toLowerCase(),
        emptyTitle: 'No products found',
        emptyBody: tab === 'all' ? 'Your store catalogue is empty. Click "+ Add product" above.' : 'No products match the selected tab filter.',
      }),
    );
    refreshTable('products');
  };

  if (hasCachedData) {
    renderProductsData(DB.products);
  }

  syncProducts()
    .then((products) => {
      renderProductsData(products);
    })
    .catch((err) => {
      const tbl = $('tbl-products');
      if (tbl) {
        tbl.innerHTML = `
          <div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);">
            <div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic(
              'alert',
            )} Failed to load products</div>
            <p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p>
            <button class="btn btn-sm btn-ghost" data-action="retry-inventory">Retry</button>
          </div>
        `;
      }
    });
}

export function renderInventoryView(params?: any[]) {
  const tab = params && params[0] ? params[0] : 'all';
  const viewEl = $('view');
  if (!viewEl) return;

  viewEl.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Store & Hardware Inventory</h1>
        <p>Live catalogue synchronized with CarQ Consumer Mobile Store. Manage pricing, inventory, and promotions.</p>
      </div>
      <div class="page-head-actions">
        <button class="btn btn-primary" data-action="open-add-product">${ic('plus')} Add product</button>
      </div>
    </div>

    <div class="grid grid-4" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--primary)"></div>
        <div class="stat-label">Total Store SKUs</div>
        <div class="stat-row"><span class="stat-num" id="kpi-total-products">—</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--success)"></div>
        <div class="stat-label">In Stock (Active)</div>
        <div class="stat-row"><span class="stat-num" id="kpi-instock-products" style="color:var(--success)">—</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--danger)"></div>
        <div class="stat-label">Out of Stock</div>
        <div class="stat-row"><span class="stat-num" id="kpi-outofstock-products" style="color:var(--danger)">—</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-bar" style="background:var(--warning)"></div>
        <div class="stat-label">On Sale / Deals</div>
        <div class="stat-row"><span class="stat-num" id="kpi-onsale-products" style="color:var(--warning)">—</span></div>
      </div>
    </div>

    <div class="tabs">
      ${inventoryTabs
        .map(
          (t) =>
            `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="inventory" data-tab="${
              t.key
            }">${t.label}</button>`,
        )
        .join('')}
    </div>

    <div id="inv-body">
      <div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading inventory…</div>
    </div>
  `;

  renderInventoryTab(tab);
}

/* =========================================================================
   ACTIONS & REGISTRATION
========================================================================= */
export function registerInventorySection() {
  registerRoute('inventory', renderInventoryView);

  registerActions({
    'open-add-product': () => openProductModal(),
    'open-edit-product': (el: HTMLElement) => {
      const p = DB.products.find((x: any) => x.id === el.dataset.id);
      if (p) openProductModal(p);
    },
    'view-product': (el: HTMLElement) => {
      if (el.dataset.id) openProductDrawer(el.dataset.id);
    },
    'toggle-stock': async (el: HTMLElement) => {
      const id = el.dataset.id;
      if (!id) return;
      try {
        await apiClient.patch(`/admin/inventory/products/${id}/stock`);
        await syncProducts();
        refreshTable('products');
        showToast('Product stock status updated.', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to update stock status', 'danger');
      }
    },
    'delete-product': async (el: HTMLElement) => {
      const id = el.dataset.id;
      if (!id) return;
      const p = DB.products.find((x: any) => x.id === id);
      if (!confirm(`Are you sure you want to delete "${p?.title || 'this product'}" from the store catalogue?`)) {
        return;
      }
      try {
        await apiClient.delete(`/admin/inventory/products/${id}`);
        await syncProducts();
        afterMutation('Product deleted from catalogue.');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete product', 'danger');
      }
    },
    'retry-inventory': () => {
      renderInventoryView();
    },
    'open-add-serials': (el: HTMLElement) => {
      const productId = el.dataset.id;
      if (!productId) return;
      const p = DB.products.find((x: any) => x.id === productId);

      openModal({
        title: `Register Serial & IMEI Units — ${p?.title || 'Product'}`,
        submitLabel: 'Register Units',
        onSubmit: () => {
          const serialsRaw = ($('f-batch-serials') as HTMLTextAreaElement)?.value || '';
          const lines = serialsRaw
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);

          if (lines.length === 0) {
            showToast('Please enter at least one Serial Number or IMEI.', 'warning');
            return;
          }

          const existing = Array.isArray(p?.serials) ? p.serials : getProductSerials(productId);
          const newUnits: SerialUnit[] = lines.map((line, i) => {
            const parts = line.split(/[,\t|]/).map((x) => x.trim());
            const serial = parts[0];
            const imei = parts[1] || `86492004${Date.now().toString().slice(-6)}${i}`;
            return {
              serial,
              imei,
              status: 'available',
              addedAt: Date.now(),
            };
          });

          // Persist directly to backend database
          apiClient.post(`/admin/inventory/products/${productId}/serials`, { serials: newUnits })
            .then(async () => {
              await syncProducts();
              closeModal();
              showToast(`Successfully registered ${newUnits.length} hardware unit(s) in warehouse.`, 'success');
              openProductDrawer(productId);
            })
            .catch((err: any) => {
              showToast(err.message || 'Failed to save serials to database', 'danger');
            });
        },
        body: `
          <div class="form-grid single">
            <div class="field">
              <label>Serial Numbers & IMEIs (One per line)</label>
              <textarea id="f-batch-serials" rows="6" placeholder="SN-OBD-4001, 864920041234561&#10;SN-OBD-4002, 864920041234562&#10;SN-OBD-4003, 864920041234563"></textarea>
              <div class="cell-sub" style="margin-top:6px;font-size:11.5px;color:var(--text-muted);">
                Paste multiple units from barcode scanners or CSV. Format: <code>SERIAL, IMEI</code> (or just Serial).
              </div>
            </div>
            <div class="field">
              <label>Default Initial Status</label>
              <select id="f-initial-status" disabled>
                <option value="available" selected>In Stock (Available for Dispatch)</option>
              </select>
            </div>
          </div>
        `,
      });
    },
    'toggle-serial-status': (el: HTMLElement) => {
      const productId = el.dataset.id;
      const idx = parseInt(el.dataset.idx || '-1', 10);
      if (!productId || idx < 0) return;

      const units = getProductSerials(productId);
      if (!units[idx]) return;

      const nextStatus: Record<string, 'available' | 'allocated' | 'defective'> = {
        available: 'allocated',
        allocated: 'defective',
        defective: 'available',
      };
      units[idx].status = nextStatus[units[idx].status] || 'available';
      if (units[idx].status === 'allocated' && !units[idx].allocatedTo) {
        units[idx].allocatedTo = `MANUAL-ALLOC-${Date.now().toString().slice(-4)}`;
      } else if (units[idx].status === 'available') {
        units[idx].allocatedTo = undefined;
      }

      saveProductSerials(productId, units);
      showToast(`Unit ${units[idx].serial} marked as ${units[idx].status}.`);

      const db = $('drawer-body');
      if (db && (state as any).drawerRenderTab) {
        db.innerHTML = (state as any).drawerRenderTab('serials');
      }
    },
    'delete-serial-unit': (el: HTMLElement) => {
      const productId = el.dataset.id;
      const idx = parseInt(el.dataset.idx || '-1', 10);
      if (!productId || idx < 0) return;

      const units = getProductSerials(productId);
      if (!units[idx]) return;
      const removed = units.splice(idx, 1);
      saveProductSerials(productId, units);
      showToast(`Unit ${removed[0]?.serial} removed from inventory.`);

      const db = $('drawer-body');
      if (db && (state as any).drawerRenderTab) {
        db.innerHTML = (state as any).drawerRenderTab('serials');
      }
    },
  });
}

// Auto-register upon import
registerInventorySection();

export default function Inventory() {
  useEffect(() => {
    renderInventoryView();
  }, []);

  return <div id="inventory-component-root" />;
}
