// ============================================================
//  api/client.ts — Axios instance + token management
// ============================================================
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ACCESS_KEY  = 'pwa_access_token';
const REFRESH_KEY = 'pwa_refresh_token';

export function getAccessToken()  { return localStorage.getItem(ACCESS_KEY) ?? ''; }
export function getRefreshToken() { return localStorage.getItem(REFRESH_KEY) ?? ''; }
export function saveTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const url = `${BASE_URL}/api/mobile${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    // Try refresh
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(method, path, body, false);
    clearTokens();
    window.location.href = '/login';
    throw new Error('SESSION_EXPIRED');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'UNKNOWN' }));
    throw Object.assign(new Error(err.error || 'REQUEST_FAILED'), { status: res.status, code: err.error });
  }

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch { return false; }
}

export const api = {
  get:    <T>(path: string) => request<T>('GET', path),
  post:   <T>(path: string, body: unknown) => request<T>('POST', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
};
