/**
 * SchooLama – UI Utilities
 * Toast notifications, modals, table builder, pagination
 */

/* ── Toast ─────────────────────────────────────────────────── */
const Toast = (() => {
  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  function show(message, type = 'info', duration = 3500) {
    const container = getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${ICONS[type] ?? ICONS.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'opacity .3s, transform .3s';
      setTimeout(() => toast.remove(), 320);
    }, duration);
  }

  return {
    success: (msg, d) => show(msg, 'success', d),
    error:   (msg, d) => show(msg, 'error',   d),
    warning: (msg, d) => show(msg, 'warning', d),
    info:    (msg, d) => show(msg, 'info',    d),
  };
})();

/* ── Modal ─────────────────────────────────────────────────── */
const Modal = (() => {
  let _overlay = null;

  function _build() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.className = 'modal-overlay';
    _overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-title"></h3>
          <button class="modal-close" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
      </div>`;

    _overlay.querySelector('.modal-close').addEventListener('click', close);
    _overlay.addEventListener('click', e => { if (e.target === _overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.body.appendChild(_overlay);
  }

  function open({ title, body, footer, size }) {
    _build();
    _overlay.querySelector('#modal-title').textContent = title ?? '';
    _overlay.querySelector('#modal-body').innerHTML  = '';
    _overlay.querySelector('#modal-footer').innerHTML = '';

    if (typeof body === 'string') {
      _overlay.querySelector('#modal-body').innerHTML = body;
    } else if (body instanceof HTMLElement) {
      _overlay.querySelector('#modal-body').appendChild(body);
    }

    if (typeof footer === 'string') {
      _overlay.querySelector('#modal-footer').innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      _overlay.querySelector('#modal-footer').appendChild(footer);
    }

    const modal = _overlay.querySelector('.modal');
    modal.style.maxWidth = size === 'lg' ? '720px' : size === 'sm' ? '400px' : '560px';

    requestAnimationFrame(() => _overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!_overlay) return;
    _overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function confirm({ title = 'Confirm', message, onConfirm, danger = false }) {
    const footer = `
      <button class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">Confirm</button>`;
    open({
      title,
      body: `<p class="confirm-text">${message}</p>`,
      footer,
      size: 'sm',
    });
    document.getElementById('modal-cancel-btn').onclick  = close;
    document.getElementById('modal-confirm-btn').onclick = () => { close(); onConfirm?.(); };
  }

  return { open, close, confirm };
})();

/* ── Table Builder ─────────────────────────────────────────── */
/**
 * Renders rows into a <tbody id="tableTbodyId">.
 * columns: [{ key, label, render }]
 * actions: (row) => HTML string for the actions cell
 */
function renderTable({ tbodyId, rows, columns, actions, emptyMessage = 'No records found.' }) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    const colSpan = columns.length + (actions ? 1 : 0);
    tbody.innerHTML = `
      <tr>
        <td colspan="${colSpan}">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 17v1a3 3 0 006 0v-1m-9-5h12M5 12V7a7 7 0 0114 0v5"/>
            </svg>
            <h3>Nothing here yet</h3>
            <p>${emptyMessage}</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr class="fade-in">
      ${columns.map(col => `<td>${col.render ? col.render(row) : (row[col.key] ?? '—')}</td>`).join('')}
      ${actions ? `<td><div class="td-actions">${actions(row)}</div></td>` : ''}
    </tr>`).join('');
}

/* ── Table Head Builder ─────────────────────────────────────── */
function renderTableHead({ theadId, columns, hasActions = true }) {
  const thead = document.getElementById(theadId);
  if (!thead) return;
  thead.innerHTML = `
    <tr>
      ${columns.map(c => `<th>${c.label}</th>`).join('')}
      ${hasActions ? '<th>Actions</th>' : ''}
    </tr>`;
}

/* ── Pagination ─────────────────────────────────────────────── */
function renderPagination({ containerId, currentPage, totalPages, totalRecords, pageSize, onPageChange }) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const from = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalRecords);

  let pages = [];
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  el.innerHTML = `
    <span>Showing <strong>${from}–${to}</strong> of <strong>${totalRecords}</strong></span>
    <div class="pagination-btns">
      <button class="page-btn" ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}"
              aria-label="Previous">‹</button>
      ${pages.map(p => p === '…'
        ? `<button class="page-btn" disabled>…</button>`
        : `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
      ).join('')}
      <button class="page-btn" ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"
              aria-label="Next">›</button>
    </div>`;

  el.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
}

/* ── Form Helpers ───────────────────────────────────────────── */
function serializeForm(formEl) {
  const data = {};
  new FormData(formEl).forEach((v, k) => { data[k] = v; });
  return data;
}

function fillForm(formEl, data) {
  if (!formEl || !data) return;
  Object.entries(data).forEach(([k, v]) => {
    const el = formEl.elements[k];
    if (el) el.value = v ?? '';
  });
}

function setLoading(btn, loading, text = 'Save') {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span> Saving…`
    : text;
}

/* ── Avatar Initial ─────────────────────────────────────────── */
function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}
