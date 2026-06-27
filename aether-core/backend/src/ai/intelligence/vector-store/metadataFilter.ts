import type { VectorQuery } from './types';

export function matchesMetadataFilter(
  metadata: Record<string, unknown> | undefined,
  filter: Record<string, string | string[]> | undefined
): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (!metadata) return false;

  for (const [key, expected] of Object.entries(filter)) {
    const actual = metadata[key];
    if (actual == null) return false;
    const values = Array.isArray(expected) ? expected : [expected];
    if (!values.includes(String(actual))) return false;
  }
  return true;
}

export function applyMetadataFilterToMatches<T extends { metadata?: Record<string, unknown> }>(
  matches: T[],
  filter: VectorQuery['metadataFilter']
): T[] {
  if (!filter) return matches;
  return matches.filter((m) => matchesMetadataFilter(m.metadata, filter));
}

export function buildMetadataFilterSql(
  filter: Record<string, string | string[]> | undefined,
  startParamIndex: number
): { clause: string; params: string[] } {
  if (!filter || Object.keys(filter).length === 0) {
    return { clause: '', params: [] };
  }

  const clauses: string[] = [];
  const params: string[] = [];
  let idx = startParamIndex;

  for (const [key, expected] of Object.entries(filter)) {
    const values = Array.isArray(expected) ? expected : [expected];
    if (values.length === 1) {
      clauses.push(`"metadata"->>'${key.replace(/'/g, "''")}' = $${idx}`);
      params.push(values[0]!);
      idx += 1;
    } else {
      const placeholders = values.map(() => `$${idx++}`);
      clauses.push(`"metadata"->>'${key.replace(/'/g, "''")}' IN (${placeholders.join(', ')})`);
      params.push(...values);
    }
  }

  return { clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params };
}
