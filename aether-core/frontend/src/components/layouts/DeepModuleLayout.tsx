import { Outlet } from 'react-router-dom';
import AppBreadcrumb from '@/components/navigation/AppBreadcrumb';

/** Deep modules — breadcrumb + consistent content gutter. */
export default function DeepModuleLayout() {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 shrink-0">
        <AppBreadcrumb />
      </div>
      <Outlet />
    </div>
  );
}
