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
  productNew: '/products/new',
  orders: '/orders',
  customers: '/customers',
  inventory: '/inventory',
  promotions: '/promotions',
  payments: '/payments',
  emails: '/emails',
  autonomous: '/autonomous',
  negotiations: '/negotiations',
  outcomes: '/outcomes',
  settings: '/settings',
  website: '/website',
  websiteBrief: '/website/brief',
  websitePreview: '/website/preview',
  websitePages: '/website/pages',
  websitePublish: '/website/publish',
  pages: '/pages',
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
