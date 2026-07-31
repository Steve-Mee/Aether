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
  '/overview': () => import('@/pages/AetherOverviewPage'),
  '/workstream': () => import('@/pages/Workstream'),
  '/goals': () => import('@/pages/GoalsPage'),
  '/goals/:id': () => import('@/pages/GoalDetailPage'),
  '/timeline': () => import('@/pages/ActionTimeline'),
  '/notifications': () => import('@/pages/NotificationsPage'),
  '/products': () => import('@/pages/Products'),
  '/products/new': () => import('@/pages/ProductNewPage'),
  '/products/:id': () => import('@/pages/ProductDetailPage'),
  '/website': () => import('@/pages/WebsiteHubPage'),
  '/website/brief': () => import('@/pages/WebsiteBriefPage'),
  '/website/preview': () => import('@/pages/WebsitePreviewPage'),
  '/website/pages': () => import('@/pages/WebsitePagesPage'),
  '/website/publish': () => import('@/pages/WebsitePublishPage'),
  '/pages': () => import('@/pages/PagesCms'),
  '/orders': () => import('@/pages/Orders'),
  '/orders/:id': () => import('@/pages/OrderDetailPage'),
  '/customers': () => import('@/pages/CustomersPage'),
  '/customers/:id': () => import('@/pages/CustomerDetailPage'),
  '/inventory': () => import('@/pages/InventoryPage'),
  '/promotions': () => import('@/pages/PromotionsPage'),
  '/payments': () => import('@/pages/PaymentsPage'),
  '/emails': () => import('@/pages/Emails'),
  '/suppliers': () => import('@/pages/Suppliers'),
  '/autonomous': () => import('@/pages/Autonomous'),
  '/approvals': () => import('@/pages/Approvals'),
  '/insights': () => import('@/pages/Insights'),
  '/agents': () => import('@/pages/AgentsPage'),
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
