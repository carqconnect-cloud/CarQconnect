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
  openModal,
  closeModal,
  registerRoute,
  registerActions,
} from '../../lib/adminShared';

export function mapRoleFromApi(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    desc: r.desc,
    perms: r.perms,
    updatedAt: r.updatedAt,
    raw: r,
  };
}

const REMOVED_ROLE_IDS = new Set(['role_2', 'role_3', 'role_4', 'role_5']);
const REMOVED_ROLE_NAMES = new Set([
  'Operations / Support Executive',
  'Sales / CRM Executive',
  'Inventory / Fulfilment Operator',
  'AI / Knowledge Manager',
]);

export async function syncRoles() {
  try {
    const res: any = await apiClient.get('/admin/roles');
    const rawItems = res.roles || res.items || res.data || (Array.isArray(res) ? res : []);
    if (rawItems && rawItems.length) {
      DB.roles = rawItems
        .filter((r: any) => !REMOVED_ROLE_IDS.has(r.id) && !REMOVED_ROLE_NAMES.has(r.name))
        .map(mapRoleFromApi)
        .filter(Boolean);
    }
    return DB.roles;
  } catch (_err) {
    return DB.roles;
  }
}

export async function syncSubAdmins() {
  try {
    const res: any = await apiClient.getSubAdmins();
    const rawItems = Array.isArray(res) ? res : res?.data || [];
    (DB as any).subAdmins = rawItems;
    return (DB as any).subAdmins;
  } catch (err: any) {
    (DB as any).subAdmins = (DB as any).subAdmins || [];
    return (DB as any).subAdmins;
  }
}

export const PERM_MODULES = [
  'Users', 'Vehicles', 'QR', 'GPS', 'Orders', 'Inventory',
  'Membership', 'SOS', 'Support', 'AI', 'CRM', 'Content', 'Reports', 'Settings'
];

export function renderRolesGrid() {
  const grid = $('roles-grid');
  if (!grid) return;
  grid.innerHTML = (DB.roles || []).map((r: any) => `<div class="card">
  <div class="card-title">${escapeHtml(r.name)}</div>
  <p class="muted" style="font-size:12.5px;margin:-6px 0 12px;">${escapeHtml(r.desc)}</p>
  ${r.perms === 'all' ? `<p class="badge badge-info">Full access to all modules</p>` :
      `<div style="max-height:260px;overflow-y:auto;">${PERM_MODULES.map(m => `<div class="switch-row">
      <span class="switch-row-label" style="font-size:12.5px;">${m}</span>
      <div class="hstack">
        ${['view', 'edit', 'delete'].map(p => `<label class="check-row" style="gap:4px;font-size:11px;color:var(--text-muted);"><input type="checkbox" data-action="toggle-perm" data-role="${r.id}" data-module="${m}" data-perm="${p}" ${r.perms && r.perms[m] && r.perms[m].includes(p) ? 'checked' : ''}> ${p}</label>`).join('')}
      </div>
    </div>`).join('')}</div>`
    }
</div>`).join('');
}

export function renderSubAdminsList() {
  const container = $('sub-admins-table-body');
  if (!container) return;

  const items: any[] = (DB as any).subAdmins || [];
  if (!items.length) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
          <div style="font-size: 14px; font-weight: 500;">No Sub-Super Admins added yet.</div>
          <div style="font-size: 12px; margin-top: 4px;">Super Admins can add delegated administrators to the dedicated table below.</div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = items
    .map(
      (sub: any) => `
    <tr>
      <td>
        <div style="font-weight: 600; color: var(--text);">${escapeHtml(
          `${sub.firstName || ''} ${sub.lastName || ''}`.trim() || 'Sub-Admin'
        )}</div>
        <div class="muted" style="font-size: 11.5px;">${escapeHtml(sub.email)}</div>
      </td>
      <td>
        <span class="badge badge-info" style="font-size: 11px;">${escapeHtml(
          sub.roleTitle || 'Sub-Super Admin'
        )}</span>
      </td>
      <td style="font-size: 12.5px;">${escapeHtml(sub.phone || '—')}</td>
      <td style="font-size: 12px;">
        ${
          sub.createdBy
            ? `<span style="font-weight: 500;">${escapeHtml(
                `${sub.createdBy.firstName || ''} ${sub.createdBy.lastName || ''}`.trim() ||
                  sub.createdBy.email
              )}</span>`
            : '<span class="muted">Super Admin</span>'
        }
      </td>
      <td>
        <span class="badge ${sub.isActive ? 'badge-success' : 'badge-danger'}" style="font-size: 11px;">
          ${sub.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style="text-align: right;">
        <button class="btn btn-sm btn-ghost danger" data-action="delete-subadmin" data-id="${
          sub.id
        }" title="Delete Sub-Admin">
          ${ic('trash')} Remove
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

export function openAddSubAdminModal() {
  openModal({
    title: 'Add Sub-Super Admin',
    submitLabel: 'Create Sub-Super Admin',
    body: `
      <div id="subadmin-modal-error" class="alert alert-danger" style="display:none; margin-bottom: 14px; font-size: 12.5px; padding: 10px 12px; border-radius: var(--radius-sm); color: var(--danger, #ef4444); background: var(--danger-bg, #fef2f2); border: 1px solid var(--danger, #fca5a5);"></div>
      
      <div class="form-grid" style="margin-bottom: 12px;">
        <div class="field">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">First Name *</label>
          <input id="subadmin-firstname" type="text" placeholder="First name" required style="width: 100%; box-sizing: border-box;" />
        </div>
        <div class="field">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Last Name *</label>
          <input id="subadmin-lastname" type="text" placeholder="Last name" required style="width: 100%; box-sizing: border-box;" />
        </div>
      </div>

      <div class="form-grid" style="margin-bottom: 12px;">
        <div class="field">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Email Address *</label>
          <input id="subadmin-email" type="email" placeholder="subadmin@fioner.com" required style="width: 100%; box-sizing: border-box;" />
        </div>
        <div class="field">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Phone</label>
          <input id="subadmin-phone" type="tel" placeholder="+91 98765 43210" style="width: 100%; box-sizing: border-box;" />
        </div>
      </div>

      <div class="form-grid" style="margin-bottom: 12px;">
        <div class="field">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Password (Min 8 chars) *</label>
          <input id="subadmin-password" type="password" placeholder="••••••••••••" required style="width: 100%; box-sizing: border-box;" />
        </div>
        <div class="field">
          <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Confirm Password *</label>
          <input id="subadmin-confirmpassword" type="password" placeholder="••••••••••••" required style="width: 100%; box-sizing: border-box;" />
        </div>
      </div>

      <div class="field" style="margin-bottom: 6px;">
        <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Role Title</label>
        <input id="subadmin-roletitle" type="text" placeholder="e.g. Regional Fleet Officer, Operations Lead" value="Sub-Super Admin" style="width: 100%; box-sizing: border-box;" />
      </div>
    `,
    onSubmit: async () => {
      const fnInput = $('subadmin-firstname') as HTMLInputElement;
      const lnInput = $('subadmin-lastname') as HTMLInputElement;
      const emailInput = $('subadmin-email') as HTMLInputElement;
      const phoneInput = $('subadmin-phone') as HTMLInputElement;
      const passInput = $('subadmin-password') as HTMLInputElement;
      const confirmPassInput = $('subadmin-confirmpassword') as HTMLInputElement;
      const roleInput = $('subadmin-roletitle') as HTMLInputElement;
      const errDiv = $('subadmin-modal-error') as HTMLElement;

      const firstName = (fnInput?.value || '').trim();
      const lastName = (lnInput?.value || '').trim();
      const email = (emailInput?.value || '').trim();
      const phone = (phoneInput?.value || '').trim();
      const password = passInput?.value || '';
      const confirmPassword = confirmPassInput?.value || '';
      const roleTitle = (roleInput?.value || '').trim() || 'Sub-Super Admin';

      if (errDiv) errDiv.style.display = 'none';

      if (!firstName || firstName.length < 2) {
        if (errDiv) {
          errDiv.textContent = 'Please enter a valid first name (at least 2 characters).';
          errDiv.style.display = 'block';
        }
        throw new Error('Please enter a valid first name.');
      }

      if (!lastName) {
        if (errDiv) {
          errDiv.textContent = 'Please enter a last name.';
          errDiv.style.display = 'block';
        }
        throw new Error('Please enter a last name.');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (errDiv) {
          errDiv.textContent = 'Please enter a valid email address.';
          errDiv.style.display = 'block';
        }
        throw new Error('Please enter a valid email address.');
      }

      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);

      if (!password || password.length < 8 || !hasLower || !hasUpper || !hasNumber) {
        if (errDiv) {
          errDiv.textContent =
            'Password must be at least 8 characters and include at least one uppercase letter (A-Z), one lowercase letter (a-z), and one number (0-9).';
          errDiv.style.display = 'block';
        }
        throw new Error('Password complexity requirements not met.');
      }

      if (password !== confirmPassword) {
        if (errDiv) {
          errDiv.textContent = 'Passwords do not match.';
          errDiv.style.display = 'block';
        }
        throw new Error('Passwords do not match.');
      }

      const created = await apiClient.createSubAdmin({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        confirmPassword,
        roleTitle,
      });

      closeModal();
      showToast(`Sub-Super Admin ${created.firstName || ''} added successfully!`, 'success');
      await syncSubAdmins();
      renderSubAdminsList();
    },
  });
}

export function renderRolesRoute() {
  const view = $('view');
  if (!view) return;
  view.innerHTML = `
    <div class="page-head" style="margin-bottom: 24px;">
      <div>
        <h1>Roles & permissions</h1>
        <p>Governance matrix and dedicated sub-super admin team management. Only Super Admins can add accounts into the sub-admin table.</p>
      </div>
    </div>

    <!-- Sub-Super Admin Team Management Card -->
    <div class="card" style="margin-bottom: 28px; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Sub-Super Admin Team</h3>
            <span class="badge badge-primary" style="font-size: 11px;">Restricted: Super Admin Only</span>
          </div>
          <p class="muted" style="font-size: 12.5px; margin: 4px 0 0 0;">
            Separate database table for delegated administrators. Only authenticated Super Admins are authorized to add or revoke accounts here.
          </p>
        </div>
        <button class="btn btn-primary" data-action="open-add-subadmin-modal" style="display: inline-flex; align-items: center; gap: 6px;">
          ${ic('plus')} Add Sub-Super Admin
        </button>
      </div>

      <div class="table-wrap" style="overflow-x: auto;">
        <table class="table" style="width: 100%;">
          <thead>
            <tr>
              <th>Admin Name / Email</th>
              <th>Role Title</th>
              <th>Phone</th>
              <th>Added By</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="sub-admins-table-body">
            <tr>
              <td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">
                Loading sub-admin accounts…
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700;">Platform Permission Matrix</h3>
      <p class="muted" style="font-size: 12.5px; margin: 0;">Capability configuration for platform security roles across all functional domains.</p>
    </div>
    <div class="grid grid-2" id="roles-grid" style="align-items:start;"></div>
  `;

  renderRolesGrid();
  renderSubAdminsList();

  syncRoles().then(() => {
    renderRolesGrid();
  });
  syncSubAdmins().then(() => {
    renderSubAdminsList();
  });
}

registerRoute('roles', renderRolesRoute);

registerActions({
  'open-add-subadmin-modal': () => {
    openAddSubAdminModal();
  },
  'delete-subadmin': async (el: any) => {
    const id = el.dataset.id;
    if (!id) return;
    if (!window.confirm('Are you sure you want to remove this Sub-Super Admin? This cannot be undone.')) {
      return;
    }
    el.disabled = true;
    try {
      await apiClient.deleteSubAdmin(id);
      showToast('Sub-Super Admin removed successfully.', 'info');
      await syncSubAdmins();
      renderSubAdminsList();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove sub-admin', 'danger');
    } finally {
      el.disabled = false;
    }
  },
  'toggle-perm': async (el: any) => {
    const roleId = el.dataset.role;
    const role = DB.roles.find((r: any) => r.id === roleId);
    if (!role || role.perms === 'all' || roleId === 'role_1') return;
    const m = el.dataset.module;
    const p = el.dataset.perm;
    const originalChecked = !el.checked;
    el.disabled = true;
    try {
      const updated: any = await apiClient.patch('/admin/roles/' + roleId, {
        module: m,
        perm: p,
        enabled: el.checked,
      });
      if (updated && updated.perms) {
        role.perms = updated.perms;
      }
      showToast('Permissions updated for ' + role.name + '.');
    } catch (err: any) {
      el.checked = originalChecked;
      showToast(err.message || 'Failed to update permissions', 'danger');
    } finally {
      el.disabled = false;
    }
  },
});

export default function RolesPermissions() {
  React.useEffect(() => {
    renderRolesRoute();
  }, []);

  return (
    <div id="roles-root">
      <div id="view"></div>
    </div>
  );
}
