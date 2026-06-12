import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { t } from '@/lib/i18n';
import { cn, focusRing } from '@/lib/utils';
import { resolveRouteDefinition } from '@/lib/navigation/routes';

export default function AppBreadcrumb() {
  const { pathname } = useLocation();
  const route = resolveRouteDefinition(pathname);

  if (!route?.parentNav) return null;

  const parentLabel = t(route.parentNav.labelKey);
  const currentLabel = route.breadcrumbLabelKey ? t(route.breadcrumbLabelKey) : parentLabel;

  return (
    <nav aria-label={t('breadcrumb.label')} className="mb-1">
      <ol className="flex flex-wrap items-center gap-1.5 text-meta text-muted-foreground">
        <li>
          <Link
            to={route.parentNav.to}
            className={cn('hover:text-foreground transition-colors duration-fast', focusRing())}
          >
            {parentLabel}
          </Link>
        </li>
        <li aria-hidden className="flex items-center">
          <ChevronRight size={14} className="opacity-50" />
        </li>
        <li className="text-foreground font-medium" aria-current="page">
          {currentLabel}
        </li>
      </ol>
    </nav>
  );
}
