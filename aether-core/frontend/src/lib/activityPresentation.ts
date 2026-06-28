import { t } from './i18n';
import type {
  ActivityCategory,
  ActivityCustomRange,
  ActivityExecutorFilter,
  ActivityFilters,
  ActivityItem,
  ActivityPeriod,
  ActivityRiskFilter,
  ActivityStatusFilter,
} from '@/types/activity';

export function resolveCategory(item: ActivityItem): ActivityCategory {
  return item.category ?? 'outcome';
}

export function matchesPeriod(
  item: ActivityItem,
  period: ActivityPeriod,
  custom?: ActivityCustomRange,
): boolean {
  const d = new Date(item.at);
  const now = new Date();
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return d >= start && d <= now;
  }
  if (period === 'custom' && custom?.from) {
    const from = new Date(custom.from);
    const to = custom.to ? new Date(custom.to) : now;
    return d >= from && d <= to;
  }
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  return d >= since;
}

export function matchesSearch(item: ActivityItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text =
    item.searchText ?? `${item.actionLabel} ${item.description} ${item.module}`.toLowerCase();
  return text.includes(q);
}

export function matchesFilters(item: ActivityItem, filters: ActivityFilters): boolean {
  if (filters.agentKey !== 'all') {
    const keys =
      item.agentKeys ??
      (Array.isArray(item.details?.agentKeys)
        ? (item.details!.agentKeys as string[])
        : typeof item.details?.agentKey === 'string'
          ? [item.details.agentKey as string]
          : undefined);
    if (!keys?.includes(filters.agentKey)) return false;
  }
  if (filters.category !== 'all' && resolveCategory(item) !== filters.category) {
    return false;
  }
  if (filters.risk !== 'all') {
    if (filters.risk === 'high' && item.risk !== 'high') return false;
    if (filters.risk === 'low' && item.risk !== 'low') return false;
  }
  if (filters.executor !== 'all' && item.executor !== filters.executor) return false;
  if (filters.status !== 'all' && item.status !== filters.status) return false;
  return true;
}

export function filterActivityItems(
  items: ActivityItem[],
  period: ActivityPeriod,
  filters: ActivityFilters,
  custom?: ActivityCustomRange,
): ActivityItem[] {
  return items
    .filter((i) => matchesPeriod(i, period, custom))
    .filter((i) => matchesSearch(i, filters.searchQuery))
    .filter((i) => matchesFilters(i, filters));
}

export interface ActivityDateGroup {
  key: string;
  label: string;
  items: ActivityItem[];
}

export function groupByDate(
  items: ActivityItem[],
  locale: 'nl' | 'en' = 'nl',
): ActivityDateGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = new Map<string, ActivityItem[]>();

  for (const item of items) {
    const d = new Date(item.at);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    let key: string;
    if (day.getTime() === today.getTime()) {
      key = 'today';
    } else if (day.getTime() === yesterday.getTime()) {
      key = 'yesterday';
    } else {
      key = day.toISOString().slice(0, 10);
    }
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === 'today') return -1;
    if (b === 'today') return 1;
    if (a === 'yesterday') return -1;
    if (b === 'yesterday') return 1;
    return b.localeCompare(a);
  });

  return orderedKeys.map((key) => ({
    key,
    label: dateGroupLabel(key, locale),
    items: groups.get(key) ?? [],
  }));
}

function dateGroupLabel(key: string, locale: 'nl' | 'en'): string {
  if (key === 'today') return t('activity.group.today');
  if (key === 'yesterday') return t('activity.group.yesterday');
  const d = new Date(key);
  return d.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function countByStatus(items: ActivityItem[]): {
  autonomous: number;
  approved: number;
} {
  let autonomous = 0;
  let approved = 0;
  for (const i of items) {
    if (i.status === 'autonomous') autonomous++;
    if (i.status === 'approved') approved++;
  }
  return { autonomous, approved };
}

export const CATEGORY_OPTIONS: ActivityCategory[] = [
  'all',
  'pricing',
  'supplier',
  'sync',
  'approval',
  'mail',
  'command',
  'outcome',
];

export const RISK_FILTER_OPTIONS: ActivityRiskFilter[] = ['all', 'low', 'high'];
export const EXECUTOR_FILTER_OPTIONS: ActivityExecutorFilter[] = ['all', 'aether', 'merchant'];
export const STATUS_FILTER_OPTIONS: ActivityStatusFilter[] = [
  'all',
  'autonomous',
  'approved',
  'rejected',
  'pending',
];

export const AGENT_FILTER_OPTIONS: import('@/types/activity').ActivityAgentFilter[] = [
  'all',
  'inventory',
  'customer',
  'pricing',
  'supplier',
  'promotion',
  'mail',
];
