import {
  COMMAND_CENTER_PATH,
  type AppRouteDefinition,
  type RouteLayout,
  type RouteModule,
  type RouteSkeleton,
  type SidebarMode,
} from './routes.types';
import { appRoutes } from './routeRegistry';

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

function matchRouteDefinition(pathname: string): AppRouteDefinition | undefined {
  const normalized = normalizePathname(pathname);
  const exact = appRoutes.find((r) => !r.redirectTo && normalized === r.path);
  if (exact) return exact;
  return appRoutes.find(
    (r) =>
      !r.redirectTo &&
      r.path !== COMMAND_CENTER_PATH &&
      !r.path.includes(':') &&
      normalized.startsWith(`${r.path}/`),
  );
}

export function resolveModule(pathname: string): RouteModule {
  const match = matchRouteDefinition(pathname);
  if (match) return match.module;
  const alias = appRoutes.find((r) => r.path === pathname && r.redirectTo);
  if (alias) return alias.module;
  return 'other';
}

export function resolveRouteDefinition(pathname: string): AppRouteDefinition | undefined {
  return matchRouteDefinition(pathname);
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
