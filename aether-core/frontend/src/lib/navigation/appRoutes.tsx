import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  appRoutes,
  COMMAND_CENTER_PATH,
  getRenderableRoutes,
  getRedirectRoutes,
  getRoutesByLayout,
  type AppRouteDefinition,
  type RouteLayout,
} from './routes';

export type LazyPage = LazyExoticComponent<ComponentType<object>>;
export type PageImportFn = () => Promise<{ default: ComponentType<object> }>;

/** Dynamic import map — used for chunk prefetch on nav hover. */
export const lazyPageImportMap: Record<string, PageImportFn> = {
  [COMMAND_CENTER_PATH]: () => import('@/pages/CommandCenterPage'),
  '/workstream': () => import('@/pages/Workstream'),
  '/timeline': () => import('@/pages/ActionTimeline'),
  '/products': () => import('@/pages/Products'),
  '/orders': () => import('@/pages/Orders'),
  '/emails': () => import('@/pages/Emails'),
  '/suppliers': () => import('@/pages/Suppliers'),
  '/autonomous': () => import('@/pages/Autonomous'),
  '/approvals': () => import('@/pages/Approvals'),
  '/insights': () => import('@/pages/Insights'),
  '/negotiations': () => import('@/pages/Negotiations'),
  '/outcomes': () => import('@/pages/Outcomes'),
  '/settings': () => import('@/pages/Settings'),
};

/** Lazy page imports — add new modules here only. */
export const lazyPageMap: Record<string, LazyPage> = Object.fromEntries(
  Object.entries(lazyPageImportMap).map(([path, importFn]) => [path, lazy(importFn)]),
) as Record<string, LazyPage>;

export const notFoundPage = lazy(() => import('@/pages/NotFound'));

export { getRenderableRoutes, getRedirectRoutes, getRoutesByLayout, appRoutes };
export type { AppRouteDefinition, RouteLayout };

export function getLazyPage(path: string): LazyPage | undefined {
  return lazyPageMap[path];
}
