import { env } from '@/lib/config';
import { getActivityDemoItems, filterDemoByPeriod, periodToDays } from './activityPageDemo';
import type {
  ActivityFeedResponse,
  ActivityItem,
  ActivityPeriod,
  ActivityCustomRange,
} from '@/types/activity';

export type ActivityFeedSource = 'live' | 'demo' | 'hybrid';

export interface MergedActivityFeed {
  items: ActivityItem[];
  source: ActivityFeedSource;
  liveCount: number;
  demoCount: number;
}

/** Stable key for deduplicating session/ephemeral items against API rows. */
export function activityDedupeKey(item: ActivityItem): string {
  if (item.related?.id && item.related?.type) {
    return `${item.related.type}:${item.related.id}:${item.actionType}`;
  }
  return item.id;
}

function inferCategory(item: ActivityItem): ActivityItem['category'] {
  if (item.category && item.category !== 'all') return item.category;
  const action = item.actionType;
  const mod = item.module;
  if (action.includes('price') || action === 'price_adjusted') return 'pricing';
  if (action.includes('supplier') || mod.includes('supplier')) return 'supplier';
  if (action.includes('sync') || (action === 'autonomy_execute' && mod.includes('inventory'))) {
    return 'sync';
  }
  if (action === 'approved' || action === 'rejected' || action.includes('approval')) {
    return 'approval';
  }
  if (mod.includes('mail') || action.includes('email')) return 'mail';
  if (action === 'command_executed') return 'command';
  if (action.includes('outcome') || mod === 'outcomes') return 'outcome';
  if (action.startsWith('autonomy_')) return 'sync';
  return 'outcome';
}

function enrichItem(item: ActivityItem): ActivityItem {
  const category = inferCategory(item);
  const searchText =
    item.searchText ??
    [item.actionLabel, item.description, item.module, item.actionType, item.impact?.value]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  return { ...item, category, searchText };
}

const MIN_LIVE_FOR_HYBRID = 5;

function isDuplicateOfLive(
  item: ActivityItem,
  liveKeys: Set<string>,
  liveIds: Set<string>,
): boolean {
  if (liveIds.has(item.id)) return true;
  const key = activityDedupeKey(item);
  return liveKeys.has(key);
}

export function mergeActivityFeed(params: {
  period: ActivityPeriod;
  customRange?: ActivityCustomRange;
  live: ActivityFeedResponse | null;
  sessionItems?: ActivityItem[];
  ephemeralItems?: ActivityItem[];
}): MergedActivityFeed {
  const demoBase = filterDemoByPeriod(getActivityDemoItems(), params.period, params.customRange);

  const liveItems = (params.live?.items ?? []).map((i) =>
    enrichItem({ ...i, source: i.source === 'command' ? 'command' : 'audit' }),
  );

  const liveIds = new Set(liveItems.map((i) => i.id));
  const liveKeys = new Set(liveItems.map(activityDedupeKey));
  const seenIds = new Set<string>(liveIds);
  const seenKeys = new Set<string>(liveKeys);

  const session = (params.sessionItems ?? []).map((i) => enrichItem({ ...i, source: 'demo' }));
  const ephemeral = (params.ephemeralItems ?? []).map((i) => enrichItem({ ...i, source: 'demo' }));

  const merged: ActivityItem[] = [
    ...ephemeral.filter((e) => !isDuplicateOfLive(e, liveKeys, liveIds)),
    ...liveItems,
    ...session.filter((s) => !isDuplicateOfLive(s, liveKeys, liveIds)),
  ];

  for (const e of ephemeral) {
    seenIds.add(e.id);
    seenKeys.add(activityDedupeKey(e));
  }
  for (const s of session) {
    seenIds.add(s.id);
    seenKeys.add(activityDedupeKey(s));
  }

  let demoUsed = 0;
  if (env.hybridDemo && liveItems.length < MIN_LIVE_FOR_HYBRID) {
    for (const d of demoBase) {
      const dKey = activityDedupeKey(d);
      if (seenIds.has(d.id) || seenKeys.has(dKey)) continue;
      merged.push(enrichItem(d));
      seenIds.add(d.id);
      seenKeys.add(dKey);
      demoUsed++;
    }
  }

  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  let source: ActivityFeedSource = 'demo';
  if (liveItems.length >= MIN_LIVE_FOR_HYBRID) source = 'live';
  else if (liveItems.length > 0 || demoUsed > 0) source = 'hybrid';

  return {
    items: merged,
    source,
    liveCount: liveItems.length,
    demoCount: demoUsed + (liveItems.length < MIN_LIVE_FOR_HYBRID ? demoBase.length : 0),
  };
}

/** Remove ephemeral items superseded by a fresh API feed. */
export function pruneEphemeralAgainstLive(
  ephemeral: ActivityItem[],
  live: ActivityFeedResponse | null,
): ActivityItem[] {
  if (!live?.items?.length) return ephemeral;
  const liveIds = new Set(live.items.map((i) => i.id));
  const liveKeys = new Set(live.items.map((i) => activityDedupeKey(i)));
  return ephemeral.filter((e) => !isDuplicateOfLive(e, liveKeys, liveIds));
}

export function periodToApiDays(period: ActivityPeriod): number {
  return periodToDays(period);
}
