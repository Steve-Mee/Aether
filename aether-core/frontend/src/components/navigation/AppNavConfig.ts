/** Re-export central route registry — prefer importing from @/lib/navigation/routes directly. */

export {
  type AppNavItem,
  type AppRouteDefinition,
  type RouteLayout,
  type RouteModule,
  type RouteSkeleton,
  type SidebarMode,
  appRoutes,
  minimalNavItems,
  COMMAND_CENTER_PATH,
  isCommandCenterHome,
  normalizePathname,
  resolveModule,
  resolveRouteDefinition,
  resolveRouteSkeleton,
  resolveSidebarMode,
  sidebarWidthClass,
  resolveRouteDensity,
  getRenderableRoutes,
  getRedirectRoutes,
  getRoutesByLayout,
  INTENT_ROUTES,
  routeForIntent,
  resolveSidecarBoostId,
} from '@/lib/navigation/routes';

export { moduleLinks } from '@/lib/navigation/moduleLinks';
