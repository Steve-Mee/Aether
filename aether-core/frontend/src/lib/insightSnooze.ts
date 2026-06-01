const STORAGE_KEY = 'aether_insight_snooze';
const TTL_MS = 24 * 60 * 60 * 1000;

interface SnoozeEntry {
  until: number;
}

type SnoozeMap = Record<string, SnoozeEntry>;

function load(): SnoozeMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SnoozeMap) : {};
  } catch {
    return {};
  }
}

function save(map: SnoozeMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function snoozeInsight(id: string): void {
  const map = load();
  map[id] = { until: Date.now() + TTL_MS };
  save(map);
}

export function isInsightSnoozed(id: string): boolean {
  const entry = load()[id];
  if (!entry) return false;
  if (entry.until < Date.now()) {
    const map = load();
    delete map[id];
    save(map);
    return false;
  }
  return true;
}

export function filterSnoozed<T extends { id: string }>(items: T[]): T[] {
  return items.filter((i) => !isInsightSnoozed(i.id));
}
