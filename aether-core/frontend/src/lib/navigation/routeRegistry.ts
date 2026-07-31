import { coreRoutes } from './routeDefs.core';
import { commerceRoutes } from './routeDefs.commerce';
import { websiteRoutes } from './routeDefs.website';
import { opsRoutes } from './routeDefs.ops';
import type { AppRouteDefinition } from './routes.types';

/** All registered routes with metadata — single source of truth. */
export const appRoutes: AppRouteDefinition[] = [
  ...coreRoutes,
  ...commerceRoutes,
  ...websiteRoutes,
  ...opsRoutes,
];
