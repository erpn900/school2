/**
 * SchooLama – Generic CRUD Page Controller
 *
 * Usage:
 *   const crud = new CrudPage({
 *     sheet:    'Students',
 *     columns:  [{ key: 'name', label: 'Name' }, ...],
 *     formFields: [...],   // for modal form
 *   });
 */
class CrudPage {
  constructor({ sheet, columns, formFields = [], pageSize = 20, extraActions = null }) {
    this.sheet       = sheet;
    this.columns     = columns;
    this.formFields  = formFields;
    this.pageSize    = pageSize;
    this.extraActions = extraActions;

    this.currentPage  = 1;
    this.totalPages   = 1;
    this.totalRecords = 0;
    this.searchQuery  = '';
    this.editingId    = null;

    this._init();
  }

  _init() {
    this._buildTableHead();
    this._bindSearch();
    this._bindAddButton();
    this.loadPage(1);
  }

  /* ── Table Head ─────────────────────────────────────────── */
  _buildTableHead() {
    renderTableHead({
      theadId:    'table-head',
      columns:    this.columns,
      hasActions: true,
    });
  }

  /* ── Search ─────────────────────────────────────────────── */
  _bindSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.searchQuery = input.value.trim();
        this.loadPage(1);
      }, 350);
    });
  }

  /* ── Add Button ─────────────────────────────────────────── */
  _bindAddButton() {
    document.getElementById('add-btn')?.addEventListener('click', () => this.openForm());
  }

  /* ── Load Page ──────────────────────────────────────────── */
  async loadPage(page) {
    this.currentPage = page;

    const tbody = document.getElementById('table-body');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="${this.columns.length + 1}" style="text-align:center;padding:2rem;color:var(--text-muted)">
          <span class="spinner spinner-dark" style="margin:0 auto;display:block;width:24px;height:24px"></span>
        </td></tr>`;
    }

    try {
      const res = await API.listRecords(this.sheet, page, this.pageSize, this.searchQuery);

      this.totalRecords = res.total  ?? 0;
      this.totalPages   = res.pages  ?? 1;

      renderTable({
        tbodyId:  'table-body',
        rows:     res.data  ?? [],
        columns:  this.columns,
        actions:  row => this._actionButtons(row),
      });

      renderPagination({
        containerId:   'pagination',
        currentPage:   this.currentPage,
        totalPages:    this.totalPages,
        totalRecords:  this.totalRecords,
        pageSize:      this.pageSize,
        onPageChange:  p => this.loadPage(p),
      });
    } catch (err) {
      Toast.error(err.message);
      if (tbody) tbody.innerHTML = `
        <tr><td colspan="${this.columns.length + 1}">
          <div class="empty-state">
            <h3>Failed to load data</h3>
            <p>${err.message}</p>
          </div>
        </td></tr>`;
    }
  }

  /* ── Action Buttons ─────────────────────────────────────── */
  _actionButtons(row) {
    let html = `
      <button class="btn btn-outline btn-sm" onclick="crud.openForm('${row.id}')">Edit</button>
      <button class="btn btn-danger btn-sm"  onclick="crud.deleteRow('${row.id}')">Delete</button>`;
    if (this.extraActions) html += this.extraActions(row);
    return html;
  }

  /* ── Open Form Modal ────────────────────────────────────── */
  async openForm(id = null) {
    this.editingId = id;
    const isEdit   = !!id;
    const title    = isEdit ? `Edit ${this.sheet.replace(/s$/, '')}` : `Add ${this.sheet.replace(/s$/, '')}`;

    const formId = 'crud-form';
    const bodyHtml = `
      <form id="${formId}" autocomplete="off">
        ${this.formFields.map(f => this._buildField(f)).join('')}
      </form>`;

    const footer = `
      <button class="btn btn-outline" onclick="Modal.close()">Cancel</button>
      <button class="btn btn-primary" id="save-btn">
        ${isEdit ? 'Save Changes' : 'Create'}
      </button>`;

    Modal.open({ title, body: bodyHtml, footer });

    if (isEdit) {
      try {
        const res  = await API.getRecord(this.sheet, id);
        const form = document.getElementById(formId);
        if (form && res.data) fillForm(form, res.data);
      } catch (err) {
        Toast.error('Failed to load record: ' + err.message);
      }
    }

    document.getElementById('save-btn')?.addEventListener('click', () => this._submitForm());
    document.getElementById(formId)?.addEventListener('submit', e => { e.preventDefault(); this._submitForm(); });
  }

  _buildField(f) {
    if (f.type === 'select') {
      const options = f.options.map(o =>
        typeof o === 'string'
          ? `<option value="${o}">${o}</option>`
          : `<option value="${o.value}">${o.label}</option>`
      ).join('');
      return `
        <div class="form-group">
          <label class="form-label" for="field-${f.name}">${f.label}${f.required ? ' *' : ''}</label>
          <select id="field-${f.name}" name="${f.name}" class="form-control" ${f.required ? 'required' : ''}>
            <option value="">Select ${f.label}</option>
            ${options}
          </select>
        </div>`;
    }

    if (f.type === 'textarea') {
      return `
        <div class="form-group">
          <label class="form-label" for="field-${f.name}">${f.label}${f.required ? ' *' : ''}</label>
          <textarea id="field-${f.name}" name="${f.name}" class="form-control"
            placeholder="${f.placeholder ?? ''}" ${f.required ? 'required' : ''}></textarea>
        </div>`;
    }

    return `
      <div class="form-group">
        <label class="form-label" for="field-${f.name}">${f.label}${f.required ? ' *' : ''}</label>
        <input id="field-${f.name}" name="${f.name}" type="${f.type ?? 'text'}"
          class="form-control" placeholder="${f.placeholder ?? ''}"
          ${f.required ? 'required' : ''} ${f.min ? `min="${f.min}"` : ''}>
      </div>`;
  }

  /* ── Submit Form ────────────────────────────────────────── */
  async _submitForm() {
    const form = document.getElementById('crud-form');
    if (!form) return;
    if (!form.reportValidity()) return;

    const saveBtn = document.getElementById('save-btn');
    setLoading(saveBtn, true);

    try {
      const fields = serializeForm(form);
      if (this.editingId) {
        await API.updateRecord(this.sheet, this.editingId, fields);
        Toast.success('Record updated.');
      } else {
        await API.createRecord(this.sheet, fields);
        Toast.success('Record created.');
      }
      Modal.close();
      this.loadPage(this.currentPage);
    } catch (err) {
      Toast.error(err.message);
      setLoading(saveBtn, false, this.editingId ? 'Save Changes' : 'Create');
    }
  }

  /* ── Delete ─────────────────────────────────────────────── */
  deleteRow(id) {
    Modal.confirm({
      title:   'Delete Record',
      message: 'Are you sure you want to delete this record? This action cannot be undone.',
      danger:  true,
      onConfirm: async () => {
        try {
          await API.deleteRecord(this.sheet, id);
          Toast.success('Record deleted.');
          this.loadPage(this.currentPage);
        } catch (err) {
          Toast.error(err.message);
        }
      },
    });
  }
}
