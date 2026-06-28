import { useMemo } from 'react';
import { useCurrentUser } from './AuthProvider';
import { can, type Permission } from './permissions';

export function usePermission(permission: Permission): boolean {
  const user = useCurrentUser();
  return useMemo(() => can(user, permission), [user, permission]);
}
