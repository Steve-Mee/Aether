/** Parses hive Insight row: category in `type` column, metric/value in JSON content. */
export interface ParsedHiveInsight {
  category: string;
  metric: string;
  value: number;
}

export function parseHiveInsightRow(row: {
  type: string;
  content: string;
}): ParsedHiveInsight | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(row.content) as Record<string, unknown>;
  } catch {
    return null;
  }

  const category =
    row.type ||
    (typeof parsed.category === 'string' ? parsed.category : undefined);
  const metric = typeof parsed.metric === 'string' ? parsed.metric : undefined;
  const value = parsed.value;

  if (!category || !metric || value == null || !Number.isFinite(Number(value))) {
    return null;
  }

  return {
    category,
    metric,
    value: Number(value),
  };
}
