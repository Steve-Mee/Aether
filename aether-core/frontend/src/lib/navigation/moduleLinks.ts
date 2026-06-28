import { COMMAND_CENTER_PATH } from './routes';

/** Canonical cross-module navigation targets. */
export const moduleLinks = {
  commandCenter: COMMAND_CENTER_PATH,
  workstream: '/workstream',
  approvals: '/approvals',
  insights: '/insights',
  activity: '/timeline',
  suppliers: '/suppliers',
  products: '/products',
  orders: '/orders',
  emails: '/emails',
  autonomous: '/autonomous',
  negotiations: '/negotiations',
  outcomes: '/outcomes',
  settings: '/settings',
} as const;

/** Deep link to a specific pending approval in Goedkeuringen. */
export function approvalDetail(id: string): string {
  return `/approvals?id=${encodeURIComponent(id)}`;
}

export type OverviewHighlightKind = 'activity' | 'approval' | 'proactive' | 'section';

/** Deep link into AETHER Overzicht with highlight focus. */
export function overviewHighlight(kind: OverviewHighlightKind, id: string): string {
  return `/overview?highlight=${encodeURIComponent(`${kind}:${id}`)}`;
}

export function overviewWithFilters(params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `/overview?${q.toString()}`;
}

export type ModuleLinkKey = keyof typeof moduleLinks;
