/** Banned copy patterns in merchant-facing UI (zero-placeholder policy). */
const BANNED_PATTERNS = [
  /lorem ipsum/i,
  /placeholder/i,
  /coming soon/i,
  /todo:/i,
  /vs last month/i,
  /elon-grade/i,
  /hive mind/i,
  /the living standard/i,
];

export function assertMerchantCopy(text: string, context: string): string {
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      if (import.meta.env.DEV) {
        console.warn(`[NoPlaceholderGuard] Blocked copy in ${context}: "${text}"`);
      }
      return '';
    }
  }
  return text;
}

export function formatMetricValue(value: number | null | undefined, formatter: (n: number) => string): string {
  if (value == null || Number.isNaN(value)) return '—';
  return formatter(value);
}
