/** Aligned with backend RBAC: viewer < operator < admin */
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Session {
  tenantId: string;
  merchantName: string;
  user: User;
  isAuthenticated: boolean;
  accessToken: string | null;
}

export interface AuthState {
  session: Session | null;
  loading: boolean;
}
