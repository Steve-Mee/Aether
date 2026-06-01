import { Brain, LayoutList, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';

export type SidebarMode = 'expanded' | 'compact' | 'rail';

export interface AppNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Minimal app navigation — Command Bar remains primary for deeper routes. */
export const minimalNavItems: AppNavItem[] = [
  { to: '/', label: 'Command Center', icon: Sparkles, end: true },
  { to: '/workstream', label: 'Vandaag', icon: LayoutList },
  { to: '/approvals', label: 'Goedkeuringen', icon: ShieldCheck },
  { to: '/insights', label: 'Inzichten', icon: Brain },
];

/** Routes where sidebar stays fully readable (overview surfaces). */
const overviewPrefixes = ['/', '/workstream', '/approvals', '/insights'];

/** Deeper module routes — sidebar recedes to icon rail. */
const deepModulePrefixes = [
  '/products',
  '/orders',
  '/emails',
  '/suppliers',
  '/settings',
  '/timeline',
  '/negotiations',
  '/autonomous',
  '/outcomes',
  '/dashboard',
];

export function isCommandCenterHome(pathname: string): boolean {
  return pathname === '/' || pathname === '/cockpit';
}

export function resolveSidebarMode(pathname: string, userCollapsed: boolean): SidebarMode {
  if (userCollapsed) return 'rail';

  const isOverview = overviewPrefixes.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isOverview) return 'expanded';

  const isDeep = deepModulePrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
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
