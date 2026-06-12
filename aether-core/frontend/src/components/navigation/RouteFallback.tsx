import { useLocation } from 'react-router-dom';
import {
  CommandCenterSkeleton,
  ApprovalsPageSkeleton,
  ActivityPageSkeleton,
  ModuleListPageSkeleton,
  InsightsPageSkeleton,
} from '@/components/ui';
import { resolveRouteSkeleton } from '@/lib/navigation/routes';

export default function RouteFallback() {
  const { pathname } = useLocation();
  const skeleton = resolveRouteSkeleton(pathname);

  let content = <InsightsPageSkeleton />;
  if (skeleton === 'command-center') content = <CommandCenterSkeleton />;
  else if (skeleton === 'module') content = <InsightsPageSkeleton />;
  else if (skeleton === 'list') {
    if (pathname.startsWith('/approvals')) content = <ApprovalsPageSkeleton />;
    else if (pathname.startsWith('/timeline')) content = <ActivityPageSkeleton />;
    else content = <ModuleListPageSkeleton />;
  }

  return <div className="max-w-5xl p-4 sm:p-6">{content}</div>;
}
