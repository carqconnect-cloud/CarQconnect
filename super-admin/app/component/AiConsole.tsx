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
  fmtDate,
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
  mountAnimations,
  registerRoute,
  registerActions,
  registerRowMenuProvider,
} from '../../lib/adminShared';

export function mapAiKnowledgeFromApi(k: any) {
  if (!k) return null;
  return {
    id: k.id,
    question: k.question,
    answer: k.answer || '',
    category: k.category,
    status: (k.status || 'draft').toLowerCase(),
    createdAt: k.createdAt ? new Date(k.createdAt).getTime() : Date.now(),
    updatedAt: k.updatedAt ? new Date(k.updatedAt).getTime() : Date.now(),
    raw: k,
  };
}

export function mapAiIntentFromApi(i: any) {
  if (!i) return null;
  return {
    id: i.id,
    name: i.name,
    tool: i.tool,
    threshold: typeof i.threshold === 'number' ? i.threshold : 0.75,
    createdAt: i.createdAt ? new Date(i.createdAt).getTime() : Date.now(),
    updatedAt: i.updatedAt ? new Date(i.updatedAt).getTime() : Date.now(),
    raw: i,
  };
}

export function mapAiToolFromApi(t: any) {
  if (!t) return null;
  return {
    id: t.id,
    toolKey: t.toolKey,
    name: t.name,
    read: Boolean(t.read),
    write: Boolean(t.write),
    updatedAt: t.updatedAt ? new Date(t.updatedAt).getTime() : Date.now(),
    raw: t,
  };
}

export function mapAiEscalationRuleFromApi(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    condition: r.condition,
    action: r.action,
    active: Boolean(r.active),
    createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now(),
    raw: r,
  };
}

export async function syncAiKnowledge(query: any = {}) {
  const res: any = await apiClient.get('/admin/ai/knowledge', { page: 1, limit: 100, ...query });
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.aiKnowledge = rawItems.map(mapAiKnowledgeFromApi).filter(Boolean);
  return DB.aiKnowledge;
}

export async function syncAiIntents() {
  const res: any = await apiClient.get('/admin/ai/intents');
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.aiIntents = rawItems.map(mapAiIntentFromApi).filter(Boolean);
  return DB.aiIntents;
}

export async function syncAiTools() {
  const res: any = await apiClient.get('/admin/ai/tools');
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.aiTools = rawItems.map(mapAiToolFromApi).filter(Boolean);
  return DB.aiTools;
}

export async function syncAiEscalationRules() {
  const res: any = await apiClient.get('/admin/ai/escalation-rules');
  const rawItems = res.items || res.data || (Array.isArray(res) ? res : []);
  DB.escalationRules = rawItems.map(mapAiEscalationRuleFromApi).filter(Boolean);
  return DB.escalationRules;
}

export async function syncAiAnalytics() {
  const res: any = await apiClient.get('/admin/ai/analytics');
  DB.aiAnalytics = res;
  return DB.aiAnalytics;
}

export function openKbModal(existing: any) {
  const isEdit = !!existing;
  openModal({
    title: isEdit ? 'Edit knowledge article' : 'Add knowledge article',
    submitLabel: 'Save article',
    body: `<div class="form-grid single">
    <div class="field"><label>Question / topic</label><input id="f-kb-q" value="${isEdit ? escapeHtml(existing.question) : ''}" placeholder="e.g. How does masked calling protect user privacy?"></div>
    <div class="field"><label>Answer / content</label><textarea id="f-kb-a" rows="4" placeholder="Article content (minimum 10 characters required when publishing)">${isEdit ? escapeHtml(existing.answer || '') : ''}</textarea></div>
    <div class="field"><label>Category</label><select id="f-kb-cat">${['Product', 'Billing', 'Safety', 'Account'].map(c => `<option ${isEdit && existing.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Status</label><select id="f-kb-status"><option value="draft" ${isEdit && existing.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${isEdit && existing.status === 'published' ? 'selected' : ''}>Published</option></select></div>
  </div>`,
    onSubmit: () => submitWithDelay(async () => {
      const question = ($('f-kb-q') as HTMLInputElement).value.trim() || 'Untitled topic';
      const answer = ($('f-kb-a') as HTMLTextAreaElement).value;
      const category = ($('f-kb-cat') as HTMLSelectElement).value;
      const status = ($('f-kb-status') as HTMLSelectElement).value;

      if (status === 'published' && (!answer || answer.trim().length < 10)) {
        showToast('Published articles require a trimmed answer containing at least 10 characters', 'danger');
        return;
      }

      try {
        if (isEdit) {
          await apiClient.patch(`/admin/ai/knowledge/${encodeURIComponent(existing.id)}`, { question, answer, category, status });
          showToast('Article updated.');
        } else {
          await apiClient.post('/admin/ai/knowledge', { question, answer, category, status });
          showToast('Article added to knowledge base.');
        }
        await syncAiKnowledge();
        refreshTable('kb');
        refreshTable('faq');
      } catch (err: any) {
        showToast(err.message || 'Failed to save article', 'danger');
      }
    })
  });
}

export async function deleteKb(id: string) {
  confirmAction('Delete knowledge article', 'Are you sure you want to delete this article? This action is permanent and audited.', 'Delete', async () => {
    try {
      await apiClient.delete(`/admin/ai/knowledge/${encodeURIComponent(id)}`);
      showToast('Knowledge article deleted.', 'danger');
      await syncAiKnowledge();
      refreshTable('kb');
      refreshTable('faq');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete article', 'danger');
    }
  }, true);
}

export function openThresholdModal(existing: any) {
  if (!existing) return;
  openModal({
    title: 'Tune Intent Threshold: ' + existing.name,
    submitLabel: 'Save threshold',
    body: `<div class="form-grid single">
    <div class="field"><label>Intent</label><input disabled value="${escapeHtml(existing.name)}"></div>
    <div class="field"><label>Mapped Tool</label><input disabled value="${escapeHtml(existing.tool || 'unmapped')}"></div>
    <div class="field"><label>Confidence Threshold (0.0 to 1.0)</label><input type="number" step="any" min="0" max="1" id="f-intent-thresh" value="${existing.threshold}"></div>
    <p class="muted" style="font-size:12px;">Threshold accepts any numeric value in [0, 1]. No rounding or artificial steps applied.</p>
  </div>`,
    onSubmit: () => submitWithDelay(async () => {
      const rawVal = ($('f-intent-thresh') as HTMLInputElement).value;
      const val = parseFloat(rawVal);
      if (isNaN(val) || val < 0 || val > 1) {
        showToast('Threshold must be a number between 0 and 1 inclusive', 'danger');
        return;
      }
      try {
        const updated: any = await apiClient.patch(`/admin/ai/intents/${encodeURIComponent(existing.id)}/threshold`, { threshold: val });
        existing.threshold = updated.threshold;
        showToast('Threshold updated for ' + existing.name + '.');
        await syncAiIntents();
        refreshTable('intents');
      } catch (err: any) {
        showToast(err.message || 'Failed to update threshold', 'danger');
      }
    })
  });
}

const aiTabs = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'knowledge', label: 'Knowledge base' },
  { key: 'intents', label: 'Intents' },
  { key: 'permissions', label: 'Tool permissions' },
  { key: 'escalation', label: 'Escalation rules' },
  { key: 'logs', label: 'Logs' },
];

export function renderAiTab(tab: string) {
  const body = $('ai-body');
  if (!body) return;

  if (tab === 'dashboard') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading AI analytics…</div>`;
    syncAiAnalytics().then((analytics: any) => {
      const counts = analytics || DB.aiAnalytics;
      const kTotal = counts?.knowledge?.total ?? DB.aiKnowledge.length;
      const kPublished = counts?.knowledge?.published ?? DB.aiKnowledge.filter((k: any) => k.status === 'published').length;
      const iTotal = counts?.intents?.total ?? DB.aiIntents.length;
      const rActive = counts?.escalationRules?.active ?? DB.escalationRules.filter((r: any) => r.active).length;

      body.innerHTML = `<div class="grid grid-4">
      <div class="stat-card"><div class="stat-bar" style="background:var(--accent)"></div><div class="stat-label">Knowledge articles</div><div class="stat-row"><span class="stat-num" data-target="${kTotal}">0</span><span class="faint" style="font-size:12px;margin-left:6px;">(${kPublished} published)</span></div></div>
      <div class="stat-card"><div class="stat-bar" style="background:var(--success)"></div><div class="stat-label">Configured intents</div><div class="stat-row"><span class="stat-num" data-target="${iTotal}">0</span></div></div>
      <div class="stat-card"><div class="stat-bar" style="background:var(--warning)"></div><div class="stat-label">Containment rate</div><div class="stat-row"><span style="font-size:13px;font-weight:600;color:var(--muted)">Unavailable (Deferred)</span></div></div>
      <div class="stat-card"><div class="stat-bar" style="background:var(--info)"></div><div class="stat-label">Avg response time</div><div class="stat-row"><span style="font-size:13px;font-weight:600;color:var(--muted)">Unavailable (Deferred)</span></div></div>
    </div>
    <div class="card" style="margin-top:14px;"><div class="card-title">Active Governance Posture</div><p class="muted" style="font-size:13px;margin:8px 0 0 0;">Runtime conversational telemetry is deferred pending autonomous dispatcher activation. Knowledge articles, configured intents, tool permission bounds (${DB.aiTools.length || 8} tools), and escalation rules (${rActive} active) are actively persisted and governed via PostgreSQL.</p></div>`;
      mountAnimations();
    }).catch((err: any) => {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load AI analytics</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-ai" data-tab="dashboard">Retry</button></div>`;
    });
  } else if (tab === 'knowledge') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading knowledge base…</div>`;
    const st = tableState('kb');
    syncAiKnowledge({ search: st.search }).then(() => {
      const cols = [
        { key: 'question', label: 'Topic', sortable: true },
        { key: 'category', label: 'Category', sortable: true },
        { key: 'status', label: 'Status', sortable: true, render: (r: any) => statusBadge(r.status) },
        { key: 'updatedAt', label: 'Updated', sortable: true, render: (r: any) => fmtDate(r.updatedAt) },
      ];
      body.innerHTML = `<div class="toolbar"><div class="toolbar-search">${ic('search')}<input placeholder="Search knowledge base…" data-table-search="kb" value="${escapeHtml(st.search)}"></div><div class="spacer"></div>
      <button class="btn btn-primary btn-sm" data-action="open-add-kb">${ic('plus')} Add article</button></div><div id="tbl-kb"></div>`;
      registerTable('kb', () => buildTable('kb', cols, DB.aiKnowledge, { perPage: 9, rowActions: (r: any) => `<div class="kebab-wrap"><button class="btn-icon" data-action="row-menu" data-menu="kb" data-id="${r.id}">${ic('kebab')}</button></div>`, emptyTitle: 'No knowledge articles', emptyBody: 'Add approved content for the AI to use.' }));
      refreshTable('kb');
    }).catch((err: any) => {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load knowledge base</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-ai" data-tab="knowledge">Retry</button></div>`;
    });
  } else if (tab === 'intents') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading intent catalog…</div>`;
    syncAiIntents().then(() => {
      const cols = [
        { key: 'name', label: 'Intent', sortable: true, render: (r: any) => `<span class="mono">${escapeHtml(r.name)}</span>` },
        { key: 'tool', label: 'Mapped tool', sortable: true, render: (r: any) => `<span class="${r.tool === 'unmapped' ? 'faint' : ''}">${escapeHtml(r.tool)}</span>` },
        { key: 'threshold', label: 'Confidence threshold', sortable: true, render: (r: any) => `<span class="mono">${typeof r.threshold === 'number' ? r.threshold.toFixed(2) : r.threshold}</span> <span class="faint" style="font-size:11px;">(${r.threshold})</span>` },
      ];
      body.innerHTML = `<div id="tbl-intents"></div>`;
      registerTable('intents', () => buildTable('intents', cols, DB.aiIntents, {
        perPage: 10,
        rowActions: (r: any) => `<div class="kebab-wrap"><button class="btn-icon" data-action="row-menu" data-menu="intent" data-id="${r.id}">${ic('kebab')}</button></div>`,
        emptyTitle: 'No intents configured',
        emptyBody: ''
      }));
      refreshTable('intents');
    }).catch((err: any) => {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load intents</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-ai" data-tab="intents">Retry</button></div>`;
    });
  } else if (tab === 'permissions') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading tool permissions…</div>`;
    syncAiTools().then(() => {
      body.innerHTML = `<div class="card"><div class="card-title">Tool permissions <span class="muted" style="font-weight:400;font-size:12px;">Read access lets the AI look up data. Write access lets it take action — always confirm before granting.</span></div>
      <div class="list-simple">
      ${DB.aiTools.map((t: any) => `<div class="list-simple-row">
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(t.name)}</div>
          <div class="cell-sub mono" style="font-size:11px;">${escapeHtml(t.toolKey || t.id)}</div>
        </div>
        <div class="hstack">
          <span class="muted" style="font-size:11.5px;">Read</span><div class="switch ${t.read ? 'on' : ''}" data-action="toggle-tool-read" data-id="${t.toolKey || t.id}"><div class="knob"></div></div>
          <span class="muted" style="font-size:11.5px;margin-left:10px;">Write</span><div class="switch ${t.write ? 'on' : ''}" data-action="toggle-tool-write" data-id="${t.toolKey || t.id}"><div class="knob"></div></div>
        </div>
      </div>`).join('')}
      </div>
    </div>`;
    }).catch((err: any) => {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load tool permissions</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-ai" data-tab="permissions">Retry</button></div>`;
    });
  } else if (tab === 'escalation') {
    body.innerHTML = `<div class="p-8 text-center muted" style="padding:40px;"><span class="spinner"></span> Loading escalation rules…</div>`;
    syncAiEscalationRules().then(() => {
      body.innerHTML = `<div class="card"><div class="card-title">Escalation rules <button class="btn btn-sm btn-primary" data-action="open-add-rule">${ic('plus')} Add rule</button></div>
      <div class="list-simple">${DB.escalationRules.map((r: any) => `<div class="list-simple-row">
        <div><div style="font-weight:600;font-size:13px;">${escapeHtml(r.condition)}</div><div class="cell-sub">${escapeHtml(r.action)}</div></div>
        <div class="hstack">
          <div class="switch ${r.active ? 'on' : ''}" data-action="toggle-rule" data-id="${r.id}"><div class="knob"></div></div>
          <button class="btn-icon" data-action="delete-rule" data-id="${r.id}" title="Delete rule" style="margin-left:8px;">${ic('trash')}</button>
        </div>
      </div>`).join('')}</div>
    </div>`;
    }).catch((err: any) => {
      body.innerHTML = `<div class="card p-6" style="margin:16px 0; border:1px solid var(--danger);"><div class="hstack" style="color:var(--danger);font-weight:600;margin-bottom:8px;">${ic('alert')} Failed to load escalation rules</div><p class="muted" style="font-size:13px;margin-bottom:12px;">${escapeHtml(err.message)}</p><button class="btn btn-sm btn-ghost" data-action="retry-ai" data-tab="escalation">Retry</button></div>`;
    });
  } else if (tab === 'logs') {
    body.innerHTML = `<div class="empty-state" style="padding:48px 24px;text-align:center;">
    <div style="font-size:32px;margin-bottom:12px;">${ic('cpu')}</div>
    <div style="font-weight:600;font-size:16px;margin-bottom:6px;">Runtime Telemetry Deferred</div>
    <div class="muted" style="font-size:13px;max-width:460px;margin:0 auto 16px auto;">Live conversational logs and telemetry ingestion are scheduled for Phase 3B runtime dispatcher activation. Mock event streams have been unmounted.</div>
    <span class="chip" style="font-size:12px;">Status: Unavailable (Deferred)</span>
  </div>`;
  }
}

export function renderAiRoute(params?: any[]) {
  const tab = params && params[0] ? params[0] : 'dashboard';
  const view = $('view');
  if (!view) return;
  view.innerHTML = `
    <div class="page-head"><div><h1>AI console</h1><p>Controlled orchestration layer: knowledge, intents, tool permissions and escalation behaviour.</p></div></div>
    <div class="tabs">${aiTabs.map(t => `<button class="tab ${t.key === tab ? 'active' : ''}" data-action="subnav" data-route="ai" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
    <div id="ai-body"></div>
  `;
  renderAiTab(tab);
}

registerRoute('ai', renderAiRoute);

registerActions({
  'open-add-kb': () => openKbModal(null),
  'open-add-rule': () => openModal({
    title: 'Add escalation rule',
    submitLabel: 'Add rule',
    body: `<div class="form-grid single"><div class="field"><label>Condition</label><input id="f-rule-cond" placeholder="e.g. Customer asks for a refund"></div><div class="field"><label>Action</label><input id="f-rule-action" placeholder="e.g. Escalate to human executive"></div></div>`,
    onSubmit: () => submitWithDelay(async () => {
      const condition = ($('f-rule-cond') as HTMLInputElement).value.trim();
      const action = ($('f-rule-action') as HTMLInputElement).value.trim();
      if (!condition || !action) {
        showToast('Both condition and action are required', 'danger');
        return;
      }
      try {
        await apiClient.post('/admin/ai/escalation-rules', { condition, action, active: true });
        showToast('Escalation rule added.');
        await syncAiEscalationRules();
        renderAiTab('escalation');
      } catch (err: any) {
        showToast(err.message || 'Failed to add rule', 'danger');
      }
    })
  }),
  'toggle-rule': async (el: any) => {
    const r = DB.escalationRules.find((x: any) => x.id === el.dataset.id);
    if (!r) return;
    try {
      const res: any = await apiClient.patch(`/admin/ai/escalation-rules/${encodeURIComponent(r.id)}`, { active: !r.active });
      r.active = res.active;
      afterMutation('Rule ' + (r.active ? 'enabled' : 'disabled') + '.');
      renderAiTab('escalation');
    } catch (err: any) {
      showToast(err.message || 'Failed to update rule', 'danger');
    }
  },
  'delete-rule': (el: any) => {
    const id = el.dataset.id;
    confirmAction('Delete escalation rule', 'Are you sure you want to delete this escalation rule?', 'Delete', async () => {
      try {
        await apiClient.delete(`/admin/ai/escalation-rules/${encodeURIComponent(id)}`);
        showToast('Escalation rule deleted.', 'danger');
        await syncAiEscalationRules();
        renderAiTab('escalation');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete rule', 'danger');
      }
    }, true);
  },
  'retry-ai': (el: any) => {
    renderAiTab(el.dataset.tab || 'dashboard');
  },
  'toggle-tool-read': async (el: any) => {
    const t = DB.aiTools.find((x: any) => x.id === el.dataset.id || x.toolKey === el.dataset.id);
    if (!t) return;
    const toolKey = t.toolKey || t.id;
    const newRead = !t.read;
    try {
      const payload: any = { read: newRead };
      if (!newRead) payload.write = false;
      const res: any = await apiClient.patch(`/admin/ai/tools/${encodeURIComponent(toolKey)}/permissions`, payload);
      t.read = res.read;
      t.write = res.write;
      if (!newRead) {
        afterMutation('Read access revoked for ' + t.name + '. Write access removed automatically.', 'danger');
      } else {
        afterMutation('Read access granted for ' + t.name + '.');
      }
      renderAiTab('permissions');
    } catch (err: any) {
      showToast(err.message || 'Failed to update tool permissions', 'danger');
    }
  },
  'toggle-tool-write': async (el: any) => {
    const t = DB.aiTools.find((x: any) => x.id === el.dataset.id || x.toolKey === el.dataset.id);
    if (!t) return;
    const toolKey = t.toolKey || t.id;
    if (!t.read) {
      showToast('Grant read access before enabling write.', 'danger');
      return;
    }
    const newWrite = !t.write;
    const proceed = async () => {
      try {
        const res: any = await apiClient.patch(`/admin/ai/tools/${encodeURIComponent(toolKey)}/permissions`, { write: newWrite });
        t.write = res.write;
        afterMutation(newWrite ? 'Write access granted for ' + t.name + '.' : 'Write access revoked for ' + t.name + '.', newWrite ? 'neutral' : 'danger');
        renderAiTab('permissions');
      } catch (err: any) {
        showToast(err.message || 'Failed to update tool permissions', 'danger');
      }
    };
    if (newWrite) {
      confirmAction('Grant write access', 'The AI will be able to take real actions using <b>' + escapeHtml(t.name) + '</b> without further confirmation for supported flows. Continue?', 'Grant access', proceed, false);
    } else {
      proceed();
    }
  },
});

registerRowMenuProvider((type, id) => {
  if (type === 'kb') {
    return [
      { label: 'Edit', icon: 'pencil', action: () => openKbModal(DB.aiKnowledge.find((x: any) => x.id === id)) },
      { label: 'Delete', icon: 'trash', danger: true, action: () => deleteKb(id) },
    ];
  }
  if (type === 'intent') {
    const item = DB.aiIntents.find((x: any) => x.id === id);
    return [
      { label: 'Tune threshold', icon: 'pencil', action: () => openThresholdModal(item) },
    ];
  }
  return [];
});

export default function AiConsole() {
  React.useEffect(() => {
    renderAiRoute();
  }, []);

  return (
    <div id="ai-root">
      <div id="view"></div>
    </div>
  );
}
