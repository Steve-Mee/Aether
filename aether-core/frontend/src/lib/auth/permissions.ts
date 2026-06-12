import type { User, UserRole } from './types';

export type Permission =
  | 'approvals.view'
  | 'approvals.approveHighRisk'
  | 'settings.manage'
  | 'command.execute';

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

const PERMISSION_MIN_ROLE: Record<Permission, UserRole> = {
  'approvals.view': 'viewer',
  'approvals.approveHighRisk': 'operator',
  'settings.manage': 'admin',
  'command.execute': 'operator',
};

export function can(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  const minRole = PERMISSION_MIN_ROLE[permission];
  return ROLE_RANK[user.role] >= ROLE_RANK[minRole];
}

export function roleMeetsMin(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}
