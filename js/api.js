/**
 * SchooLama – API Client
 * Communicates with Google Apps Script backend.
 * All requests are GET with JSON responses.
 */
const API = (() => {
  const STORAGE_KEY = 'schoolama_user';
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

  function normalizeRole(role, fallbackRole = '') {
    const normalized = String(role || fallbackRole).trim().toLowerCase();
    return VALID_ROLES.includes(normalized) ? normalized : '';
  }

  function normalizeUserResponse(data, fallbackRole = '') {
    if (!data || typeof data !== 'object') return null;

    const payload = data.data && typeof data.data === 'object' ? data.data : data;
    const source = payload.user && typeof payload.user === 'object'
      ? payload.user
      : data.user && typeof data.user === 'object'
        ? data.user
        : payload;

    const role = normalizeRole(source.role || payload.role || data.role, fallbackRole);
    if (!role) return null;

    return {
      ...source,
      token: source.token || payload.token || data.token || '',
      role,
    };
  }

  async function login(username, password, role) {
    const data = await request({ action: 'login', username, password, role });
    const user = normalizeUserResponse(data, role);
    if (!user) throw new Error('Login succeeded, but the user role was not returned.');

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const user = normalizeUserResponse(parsed);

      if (parsed && !user) {
        localStorage.removeItem(STORAGE_KEY);
      } else if (user && JSON.stringify(user) !== raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }

      return user;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function isLoggedIn() {
    return !!getUser();
  }
