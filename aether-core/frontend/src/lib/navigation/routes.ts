import {
  Brain,
  History,
  LayoutList,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from 'lucide-react';

export const COMMAND_CENTER_PATH = '/command-center';

export type SidebarMode = 'expanded' | 'compact' | 'rail';

export type RouteLayout = 'overview' | 'deep' | 'settings';

export type RouteSkeleton = 'command-center' | 'module' | 'list';

export type RouteModule =
  | 'command-center'
  | 'approvals'
  | 'insights'
  | 'timeline'
  | 'suppliers'
  | 'workstream'
  | 'settings'
  | 'emails'
  | 'orders'
  | 'products'
  | 'autonomous'
  | 'outcomes'
  | 'negotiations'
  | 'other';

export interface AppNavItem {
  to: string;
  label: string;
  labelKey?: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface AppRouteDefinition {
  path: string;
  module: RouteModule;
  /** Sidebar behavior group */
  sidebarGroup: 'home' | 'overview' | 'deep';
  /** Nested layout under AppShell */
  layout: RouteLayout;
  /** Show in minimal sidebar nav */
  inNav?: boolean;
  /** Legacy redirect target */
  redirectTo?: string;
  /** i18n label key for route context strip hints */
  contextHintKey?: string;
  /** Breadcrumb parent (deep + settings) */
  parentNav?: { to: string; labelKey: string };
  /** Suspense fallback skeleton */
  skeleton?: RouteSkeleton;
  /** i18n key for breadcrumb current segment */
  breadcrumbLabelKey?: string;
}

const commandCenterParent = {
  to: COMMAND_CENTER_PATH,
  labelKey: 'nav.commandCenter',
} as const;

/** Minimal app navigation — Command Bar remains primary for deeper routes. */
export const minimalNavItems: AppNavItem[] = [
  {
    to: COMMAND_CENTER_PATH,
    label: 'Command Center',
    labelKey: 'nav.commandCenter',
    icon: Sparkles,
    end: true,
  },
  { to: '/workstream', label: 'Vandaag', labelKey: 'nav.workstream', icon: LayoutList },
  { to: '/approvals', label: 'Goedkeuringen', labelKey: 'nav.approvals', icon: ShieldCheck },
  { to: '/insights', label: 'Inzichten', labelKey: 'nav.insights', icon: Brain },
  { to: '/timeline', label: 'Activiteit', labelKey: 'nav.timeline', icon: History },
  { to: '/suppliers', label: 'Leveranciers', labelKey: 'nav.suppliers', icon: Truck },
];

/** All registered routes with metadata — single source of truth. */
export const appRoutes: AppRouteDefinition[] = [
  {
    path: COMMAND_CENTER_PATH,
    module: 'command-center',
    sidebarGroup: 'home',
    layout: 'overview',
    inNav: true,
    skeleton: 'command-center',
    breadcrumbLabelKey: 'nav.commandCenter',
  },
  {
    path: '/',
    module: 'command-center',
    sidebarGroup: 'home',
    layout: 'overview',
    redirectTo: COMMAND_CENTER_PATH,
  },
  {
    path: '/home',
    module: 'command-center',
    sidebarGroup: 'home',
    layout: 'overview',
    redirectTo: COMMAND_CENTER_PATH,
  },
  {
    path: '/cockpit',
    module: 'command-center',
    sidebarGroup: 'home',
    layout: 'overview',
    redirectTo: COMMAND_CENTER_PATH,
  },
  {
    path: '/workstream',
    module: 'workstream',
    sidebarGroup: 'overview',
    layout: 'overview',
    inNav: true,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.workstream',
  },
  {
    path: '/approvals',
    module: 'approvals',
    sidebarGroup: 'overview',
    layout: 'overview',
    inNav: true,
    skeleton: 'list',
    breadcrumbLabelKey: 'nav.approvals',
  },
  {
    path: '/insights',
    module: 'insights',
    sidebarGroup: 'overview',
    layout: 'overview',
    inNav: true,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.insights',
  },
  {
    path: '/timeline',
    module: 'timeline',
    sidebarGroup: 'overview',
    layout: 'overview',
    inNav: true,
    skeleton: 'list',
    breadcrumbLabelKey: 'nav.timeline',
  },
  {
    path: '/activity',
    module: 'timeline',
    sidebarGroup: 'overview',
    layout: 'overview',
    redirectTo: '/timeline',
  },
  {
    path: '/history',
    module: 'timeline',
    sidebarGroup: 'overview',
    layout: 'overview',
    redirectTo: '/timeline',
  },
  {
    path: '/dashboard',
    module: 'command-center',
    sidebarGroup: 'deep',
    layout: 'overview',
    redirectTo: COMMAND_CENTER_PATH,
  },
  {
    path: '/products',
    module: 'products',
    sidebarGroup: 'deep',
    layout: 'deep',
    parentNav: commandCenterParent,
    skeleton: 'list',
    breadcrumbLabelKey: 'nav.products',
  },
  {
    path: '/orders',
    module: 'orders',
    sidebarGroup: 'deep',
    layout: 'deep',
    parentNav: commandCenterParent,
    skeleton: 'list',
    breadcrumbLabelKey: 'nav.orders',
  },
  {
    path: '/emails',
    module: 'emails',
    sidebarGroup: 'deep',
    layout: 'deep',
    parentNav: commandCenterParent,
    skeleton: 'list',
    breadcrumbLabelKey: 'nav.emails',
  },
  {
    path: '/suppliers',
    module: 'suppliers',
    sidebarGroup: 'deep',
    layout: 'deep',
    inNav: true,
    parentNav: commandCenterParent,
    skeleton: 'list',
    breadcrumbLabelKey: 'nav.suppliers',
  },
  {
    path: '/autonomous',
    module: 'autonomous',
    sidebarGroup: 'deep',
    layout: 'deep',
    parentNav: commandCenterParent,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.autonomous',
  },
  {
    path: '/negotiations',
    module: 'negotiations',
    sidebarGroup: 'deep',
    layout: 'deep',
    parentNav: commandCenterParent,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.negotiations',
  },
  {
    path: '/outcomes',
    module: 'outcomes',
    sidebarGroup: 'deep',
    layout: 'deep',
    parentNav: commandCenterParent,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.outcomes',
  },
  {
    path: '/settings',
    module: 'settings',
    sidebarGroup: 'deep',
    layout: 'settings',
    parentNav: commandCenterParent,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.settings',
  },
];

const overviewPaths = appRoutes
  .filter((r) => !r.redirectTo && (r.sidebarGroup === 'home' || r.sidebarGroup === 'overview'))
  .map((r) => r.path);

const deepModulePaths = appRoutes
  .filter((r) => !r.redirectTo && r.sidebarGroup === 'deep')
  .map((r) => r.path);

const COMMAND_CENTER_ALIASES = new Set([
  '/',
  '/home',
  '/cockpit',
  '/dashboard',
  COMMAND_CENTER_PATH,
]);

export function isCommandCenterHome(pathname: string): boolean {
  return COMMAND_CENTER_ALIASES.has(pathname);
}

export function normalizePathname(pathname: string): string {
  if (pathname === '/' || pathname === '/home') return COMMAND_CENTER_PATH;
  const redirect = appRoutes.find((r) => r.path === pathname && r.redirectTo);
  return redirect?.redirectTo ?? pathname;
}

export function resolveModule(pathname: string): RouteModule {
  const normalized = normalizePathname(pathname);
  const match = appRoutes.find((r) => {
    if (r.redirectTo) return false;
    return (
      normalized === r.path ||
      (r.path !== COMMAND_CENTER_PATH && normalized.startsWith(`${r.path}/`))
    );
  });
  if (match) return match.module;
  const alias = appRoutes.find((r) => r.path === pathname && r.redirectTo);
  if (alias) return alias.module;
  return 'other';
}

export function resolveRouteDefinition(pathname: string): AppRouteDefinition | undefined {
  const normalized = normalizePathname(pathname);
  return appRoutes.find(
    (r) =>
      !r.redirectTo &&
      (normalized === r.path ||
        (r.path !== COMMAND_CENTER_PATH && normalized.startsWith(`${r.path}/`))),
  );
}

export function resolveRouteSkeleton(pathname: string): RouteSkeleton {
  return resolveRouteDefinition(pathname)?.skeleton ?? 'module';
}

export function getRenderableRoutes(): AppRouteDefinition[] {
  return appRoutes.filter((r) => !r.redirectTo);
}

export function getRedirectRoutes(): AppRouteDefinition[] {
  return appRoutes.filter((r) => Boolean(r.redirectTo));
}

export function getRoutesByLayout(layout: RouteLayout): AppRouteDefinition[] {
  return getRenderableRoutes().filter((r) => r.layout === layout);
}

export function resolveSidebarMode(pathname: string, userCollapsed: boolean): SidebarMode {
  if (userCollapsed) return 'rail';

  const normalized = normalizePathname(pathname);

  const isOverview = overviewPaths.some((p) => normalized === p || normalized.startsWith(`${p}/`));
  if (isOverview) return 'expanded';

  const isDeep = deepModulePaths.some((p) => normalized === p || normalized.startsWith(`${p}/`));
  if (isDeep) return 'rail';

  return 'compact';
}

export function sidebarWidthClass(mode: SidebarMode): string {
  switch (mode) {
    case 'rail':
      return 'w-[4.25rem]';
    case 'compact':
      return 'w-52';
    case 'expanded':
    default:
      return 'w-60';
  }
}

export function resolveRouteDensity(pathname: string): 'compact' | 'default' {
  const normalized = normalizePathname(pathname);
  return normalized.startsWith('/approvals') || normalized.startsWith('/timeline')
    ? 'compact'
    : 'default';
}

/** NL command intent → route mapping */
export const INTENT_ROUTES: Record<string, string> = {
  LOW_MARGIN_REPORT: '/products',
  EMAIL_SUMMARY: '/emails',
  PENDING_APPROVALS: '/workstream',
  SUPPLIER_MONITOR: '/suppliers',
  SUPPLIER_CREATE: '/suppliers',
  INVENTORY_STATUS: '/products',
  ORDER_STATUS: '/orders',
  OUTCOMES_REPORT: '/outcomes',
  OUTCOME_VERIFY: '/outcomes',
  APPROVE_CHANGES: '/approvals',
  FORECAST: '/insights',
  PRICE_UPDATE: '/products',
};

export function routeForIntent(intent: string): string | null {
  return INTENT_ROUTES[intent] ?? null;
}

/** Sidecar signal boost per path prefix */
const SIDECAR_BOOST_BY_PATH: Record<string, string> = {
  '/emails': 'mail',
  '/approvals': 'approvals',
  '/products': 'margin',
  '/suppliers': 'margin',
  '/outcomes': 'uplift',
  '/autonomous': 'autonomy',
};

export function resolveSidecarBoostId(pathname: string): string | null {
  const normalized = normalizePathname(pathname);
  const entry = Object.entries(SIDECAR_BOOST_BY_PATH).find(([path]) => normalized.startsWith(path));
  return entry?.[1] ?? null;
}
