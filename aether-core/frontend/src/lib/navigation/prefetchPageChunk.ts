import { lazyPageImportMap } from './appRoutes';

const prefetched = new Set<string>();

/** Prefetch lazy route JS chunks on sidebar hover — pairs with navPrefetch query warming. */
export function prefetchPageChunk(path: string): void {
  if (prefetched.has(path)) return;
  const load = lazyPageImportMap[path];
  if (!load) return;
  prefetched.add(path);
  void load();
}
