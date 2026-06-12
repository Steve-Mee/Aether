import type { User, UserRole } from '@/lib/auth/types';

/** Body for POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

/** Response from POST /api/auth/login and POST /api/auth/refresh */
export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tenantId: string;
  merchantName: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export type RefreshResponse = LoginResponse;

/** Response from GET /api/auth/session */
export interface SessionResponse {
  tenantId: string;
  merchantName: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export function loginResponseToSession(
  response: LoginResponse,
): import('@/lib/auth/types').Session {
  return {
    tenantId: response.tenantId,
    merchantName: response.merchantName,
    user: {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
    },
    accessToken: response.accessToken,
    isAuthenticated: true,
  };
}

export function sessionResponseToSession(
  response: SessionResponse,
  accessToken: string,
): import('@/lib/auth/types').Session {
  return {
    tenantId: response.tenantId,
    merchantName: response.merchantName,
    user: {
      id: response.user.id,
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
    },
    accessToken,
    isAuthenticated: true,
  };
}
