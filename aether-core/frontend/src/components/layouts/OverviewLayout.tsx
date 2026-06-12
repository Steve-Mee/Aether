import { Outlet } from 'react-router-dom';

/** Overview modules — shared padding; no breadcrumb (calmer hub pages). */
export default function OverviewLayout() {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <Outlet />
    </div>
  );
}
