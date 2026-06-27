const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'for',
  'to',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'and',
  'or',
  'de',
  'het',
  'een',
  'voor',
  'van',
  'met',
  'op',
  'in',
  'naar',
  'bij',
  'en',
  'of',
  'prijs',
  'price',
  'prijzen',
  'prices',
  'optimaliseer',
  'optimize',
  'verhoog',
  'verlaag',
  'raise',
  'lower',
  'show',
  'list',
  'get',
  'maak',
  'create',
]);

/** Extract meaningful tokens from a command for keyword product search. */
export function extractKeywords(command: string): string {
  const tokens = command
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

  if (tokens.length === 0) return command.trim();
  // Prefer longest token (often product name fragment)
  return tokens.sort((a, b) => b.length - a.length).slice(0, 3).join(' ');
}
