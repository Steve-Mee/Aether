import { apiFetch } from '@/lib/api';
import { apiRoutes } from '@/lib/api/routes';
import type { LoginRequest, LoginResponse, RefreshResponse, SessionResponse } from '@/types/auth';

async function authFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
  skipRefresh = false,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return apiFetch<T>(path, { ...options, headers }, { retry: false, skipRefresh });
}

export const authApi = {
  login: (body: LoginRequest) =>
    authFetch<LoginResponse>(
      apiRoutes.auth.login,
      { method: 'POST', body: JSON.stringify(body) },
      null,
      true,
    ),

  refresh: () => authFetch<RefreshResponse>(apiRoutes.auth.refresh, { method: 'POST' }, null, true),

  session: (accessToken: string) =>
    authFetch<SessionResponse>(apiRoutes.auth.session, { method: 'GET' }, accessToken),

  logout: (accessToken: string | null) =>
    authFetch<void>(apiRoutes.auth.logout, { method: 'POST' }, accessToken, true),
};
