import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { COMMAND_CENTER_PATH } from '@/lib/navigation/routes';
import { t } from '@/lib/i18n';
import { useCurrentUser } from './AuthProvider';
import { can, type Permission } from './permissions';

interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const user = useCurrentUser();

  if (can(user, permission)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center"
      data-testid="auth-access-denied"
    >
      <p className="text-headline font-semibold text-foreground">{t('auth.accessDenied.title')}</p>
      <p className="text-meta text-muted-foreground mt-2 max-w-sm">{t('auth.accessDenied.body')}</p>
      <Link to={COMMAND_CENTER_PATH} className="mt-6 text-sm text-primary hover:underline">
        {t('auth.accessDenied.back')}
      </Link>
    </div>
  );
}
