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

export type ModuleLinkKey = keyof typeof moduleLinks;
