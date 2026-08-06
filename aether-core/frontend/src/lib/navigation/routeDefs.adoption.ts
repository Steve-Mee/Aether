import type { AppRouteDefinition } from './routes.types';

/** Adoption routes — onboarding and capability discovery. */
export const adoptionRoutes: AppRouteDefinition[] = [
  {
    path: '/onboarding',
    module: 'onboarding',
    sidebarGroup: 'deep',
    layout: 'full',
    inNav: false,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.onboarding',
  },
  {
    path: '/capabilities',
    module: 'capabilities',
    sidebarGroup: 'overview',
    layout: 'overview',
    inNav: true,
    skeleton: 'module',
    breadcrumbLabelKey: 'nav.capabilities',
  },
];
