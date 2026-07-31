/** Navigation domain barrel — re-exports all public symbols for stable import paths. */
export {
  COMMAND_CENTER_PATH,
  commandCenterParent,
  type AppNavItem,
  type AppRouteDefinition,
  type NavGroup,
  type RouteLayout,
  type RouteModule,
  type RouteSkeleton,
  type SidebarMode,
} from './routes.types';

export { minimalNavItems } from './navItems';
export { appRoutes } from './routeRegistry';
export {
  getRedirectRoutes,
  getRenderableRoutes,
  getRoutesByLayout,
  isCommandCenterHome,
  normalizePathname,
  resolveModule,
  resolveRouteDefinition,
  resolveRouteDensity,
  resolveRouteSkeleton,
  resolveSidebarMode,
  sidebarWidthClass,
} from './routeResolvers';
export { INTENT_ROUTES, resolveSidecarBoostId, routeForIntent } from './intentRoutes';
