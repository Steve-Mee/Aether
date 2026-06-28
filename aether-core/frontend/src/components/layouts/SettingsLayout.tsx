import { Outlet } from 'react-router-dom';
import AppBreadcrumb from '@/components/navigation/AppBreadcrumb';
import { RequirePermission } from '@/lib/auth/RequirePermission';

/** Settings — breadcrumb + outlet for future /settings/:section. */
export default function SettingsLayout() {
  return (
    <RequirePermission permission="settings.manage">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 shrink-0">
          <AppBreadcrumb />
        </div>
        <Outlet />
      </div>
    </RequirePermission>
  );
}
