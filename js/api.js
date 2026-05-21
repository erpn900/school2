/**
 * SchooLama – API Client
 * Communicates with Google Apps Script backend.
 * All requests are GET with JSON responses.
 */
const API = (() => {
  const STORAGE_KEY = 'schoolama_user';
  const SESSION_STORAGE_KEY = 'schoolama_session_user';
  const VALID_ROLES = ['admin', 'teacher', 'student', 'parent'];

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

  function pickField(obj, names) {
    if (!obj || typeof obj !== 'object') return undefined;

    for (const name of names) {
      if (obj[name] !== undefined && obj[name] !== null && obj[name] !== '') {
        return obj[name];
      }
    }

    const entries = Object.entries(obj);
    for (const name of names) {
      const lowerName = name.toLowerCase();
      const match = entries.find(([key, value]) =>
        key.toLowerCase() === lowerName && value !== undefined && value !== null && value !== ''
      );
      if (match) return match[1];
    }

    return undefined;
  }

  function normalizeRole(role, fallbackRole = '') {
    const normalized = String(role || fallbackRole).trim().toLowerCase();
    return VALID_ROLES.includes(normalized) ? normalized : '';
  }

  function normalizeUserResponse(data, fallbackRole = '') {
    if (!data || typeof data !== 'object') return null;

    const wrappedPayload = pickField(data, ['data', 'result', 'payload', 'response']);
    const payload = wrappedPayload && typeof wrappedPayload === 'object' ? wrappedPayload : data;
    const source = pickField(payload, ['user', 'account', 'profile'])
      || pickField(data, ['user', 'account', 'profile'])
      || payload;

    if (!source || typeof source !== 'object') return null;

    const role = normalizeRole(
      pickField(source, ['role', 'userRole', 'user_type', 'userType', 'type'])
        || pickField(payload, ['role', 'userRole', 'user_type', 'userType', 'type'])
        || pickField(data, ['role', 'userRole', 'user_type', 'userType', 'type']),
      fallbackRole
    );
    if (!role) return null;

    return {
      ...source,
      username: pickField(source, ['username', 'userName', 'email', 'id']) || '',
      name: pickField(source, ['name', 'fullName', 'displayName']) || pickField(source, ['username', 'userName', 'email']) || '',
      token: pickField(source, ['token', 'authToken', 'sessionToken', 'accessToken'])
        || pickField(payload, ['token', 'authToken', 'sessionToken', 'accessToken'])
        || pickField(data, ['token', 'authToken', 'sessionToken', 'accessToken'])
        || '',
      role,
    };
  }

  function getStorage(name) {
    try {
      return window?.[name] || null;
    } catch {
      return null;
    }
  }

  function safeGet(storage, key) {
    try {
      return storage?.getItem(key) || null;
    } catch {
      return null;
    }
  }

  function safeSet(storage, key, value) {
    try {
      if (!storage) return false;
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function safeRemove(storage, key) {
    try {
      storage?.removeItem(key);
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  function getStoredUserRaw() {
    return safeGet(getStorage('localStorage'), STORAGE_KEY)
      || safeGet(getStorage('sessionStorage'), SESSION_STORAGE_KEY);
  }

  function saveUser(user, required = false) {
    const raw = JSON.stringify(user);
    const savedLocal = safeSet(getStorage('localStorage'), STORAGE_KEY, raw);
    const savedSession = safeSet(getStorage('sessionStorage'), SESSION_STORAGE_KEY, raw);

    if (required && !savedLocal && !savedSession) {
      throw new Error('Your browser blocked session storage. Please allow site data and try again.');
    }
  }

  function clearUser() {
    safeRemove(getStorage('localStorage'), STORAGE_KEY);
    safeRemove(getStorage('sessionStorage'), SESSION_STORAGE_KEY);
  }

  async function login(username, password, role) {
    const data = await request({ action: 'login', username, password, role });
    const user = normalizeUserResponse(data, role);
    if (!user) throw new Error('Login succeeded, but the user role was not returned.');

    saveUser(user, true);
    return user;
  }

  function logout() {
    clearUser();
  }

  function getUser() {
    try {
      const raw = getStoredUserRaw();
      const parsed = raw ? JSON.parse(raw) : null;
      const user = normalizeUserResponse(parsed);

      if (parsed && !user) {
        clearUser();
      } else if (user && JSON.stringify(user) !== raw) {
        saveUser(user);
      }

      return user;
    } catch {
      clearUser();
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
