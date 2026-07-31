import type { LucideIcon } from 'lucide-react';

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
  | 'goals'
  | 'settings'
  | 'emails'
  | 'orders'
  | 'products'
  | 'customers'
  | 'inventory'
  | 'promotions'
  | 'payments'
  | 'autonomous'
  | 'outcomes'
  | 'negotiations'
  | 'agents'
  | 'aether-overview'
  | 'website'
  | 'other';

export type NavGroup = 'default' | 'commerce' | 'website';

export interface AppNavItem {
  to: string;
  label: string;
  labelKey?: string;
  icon: LucideIcon;
  end?: boolean;
  /** Optional sidebar section grouping */
  navGroup?: NavGroup;
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
  /** Optional sidebar section grouping */
  navGroup?: NavGroup;
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

export const commandCenterParent = {
  to: COMMAND_CENTER_PATH,
  labelKey: 'nav.commandCenter',
} as const;
