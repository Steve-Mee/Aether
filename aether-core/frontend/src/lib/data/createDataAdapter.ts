import { env } from '@/lib/config/env';
import type { DataAdapter } from './adapters/DataAdapter';
import { httpDataAdapter } from './adapters/httpAdapter';
import { mockDataAdapter } from './adapters/mockAdapter';

let adapter: DataAdapter | null = null;
let overrideAdapter: DataAdapter | null = null;

/** Override adapter (tests). */
export function setDataAdapterForTests(next: DataAdapter | null): void {
  overrideAdapter = next;
  adapter = null;
}

export function getDataAdapter(): DataAdapter {
  if (overrideAdapter) return overrideAdapter;
  if (!adapter) {
    adapter = env.isMockMode ? mockDataAdapter : httpDataAdapter;
  }
  return adapter;
}

export function resetDataAdapter(): void {
  adapter = null;
  overrideAdapter = null;
}
