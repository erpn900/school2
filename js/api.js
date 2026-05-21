/**
 * SchooLama – API Client
 * Communicates with Google Apps Script backend.
 * All requests are GET with JSON responses.
 */
const API = (() => {
  const STORAGE_KEY = 'schoolama_user';

  /**
   * Core fetch wrapper with timeout & error handling
   */
  async function request(params = {}) {
    const base = window.BACKEND_URL;
    if (!base) throw new Error('Backend URL not configured.');

    const url = new URL(base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message || 'Unknown server error');
      return json;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      throw err;
    }
  }

  /* ── Auth ─────────────────────────────────────────────────── */

  async function login(username, password, role) {
    const data = await request({ action: 'login', username, password, role });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getUser();
  }

  /* ── CRUD helpers ─────────────────────────────────────────── */

  function getAuthParams() {
    const u = getUser();
    if (!u) throw new Error('Not authenticated');
    return { token: u.token };
  }

  async function listRecords(sheet, page = 1, pageSize = 20, search = '') {
    return request({ action: 'list', sheet, page, pageSize, search, ...getAuthParams() });
  }

  async function getRecord(sheet, id) {
    return request({ action: 'get', sheet, id, ...getAuthParams() });
  }

  async function createRecord(sheet, fields) {
    return request({ action: 'create', sheet, fields: JSON.stringify(fields), ...getAuthParams() });
  }

  async function updateRecord(sheet, id, fields) {
    return request({ action: 'update', sheet, id, fields: JSON.stringify(fields), ...getAuthParams() });
  }

  async function deleteRecord(sheet, id) {
    return request({ action: 'delete', sheet, id, ...getAuthParams() });
  }

  async function getDashboard() {
    return request({ action: 'dashboard', ...getAuthParams() });
  }

  return {
    login, logout, getUser, isLoggedIn,
    listRecords, getRecord, createRecord, updateRecord, deleteRecord,
    getDashboard,
  };
})();
