import type { ReactNode } from 'react';
import type { PageTreeNode } from '../sdk/storefrontClient';

export interface BlockProps {
  props?: Record<string, unknown>;
  children?: ReactNode;
  node?: PageTreeNode;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
