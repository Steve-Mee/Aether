import { DEFAULT_PROMPT_MAX_CHARS, DEFAULT_RECALL_MAX_ENTRIES } from './constants';
import type { ScoredMemoryEntry } from './types';

export function formatRelativeAge(timestamp: string, now = Date.now()): string {
  const then = new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return 'onbekend';

  const diffMs = Math.max(0, now - then);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'zojuist' : `${diffMinutes} minuten geleden`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 uur geleden' : `${diffHours} uur geleden`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 'en' : ''} geleden`;
  return `${Math.floor(diffDays / 30)} maand${diffDays >= 60 ? 'en' : ''} geleden`;
}

export function formatMemoryLine(entry: ScoredMemoryEntry): string {
  const kindLabel =
    entry.kind === 'semantic' ? 'feit'
    : entry.kind === 'plan' ? 'plan'
    : entry.kind === 'adaptive' ? 'voorkeur'
    : entry.kind === 'reflection' ? 'reflectie'
    : 'ervaring';
  const summary = `${entry.entry.command} → ${entry.entry.outcome}`;
  return `- [${entry.ageLabel}|${kindLabel}] ${summary}`;
}

export function formatReflectionBlock(
  entries: ScoredMemoryEntry[],
  maxChars = DEFAULT_PROMPT_MAX_CHARS
): string {
  const reflectionEntries = entries.filter((e) => e.kind === 'reflection');
  if (reflectionEntries.length === 0) return '';

  const lines: string[] = [];
  let used = 0;
  const header = 'Eerdere reflecties (leer van ervaring):\n';

  for (const entry of reflectionEntries.slice(0, 2)) {
    const line = formatMemoryLine(entry);
    if (used + line.length + 1 > maxChars && lines.length > 0) break;
    lines.push(line);
    used += line.length + 1;
  }

  if (lines.length === 0) return '';
  return `${header}${lines.join('\n')}`;
}

export function formatForPrompt(
  entries: ScoredMemoryEntry[],
  maxChars = DEFAULT_PROMPT_MAX_CHARS,
  maxEntries = DEFAULT_RECALL_MAX_ENTRIES
): string {
  const nonReflection = entries.filter((e) => e.kind !== 'reflection');
  const selected = nonReflection.slice(0, maxEntries);
  if (selected.length === 0) return '';

  const lines: string[] = [];
  let used = 0;
  const header = 'Relevante eerdere ervaringen:\n';

  for (const entry of selected) {
    const line = formatMemoryLine(entry);
    if (used + line.length + 1 > maxChars && lines.length > 0) break;
    lines.push(line);
    used += line.length + 1;
  }

  if (lines.length === 0) return '';
  return `${header}${lines.join('\n')}`;
}

export function buildReflectionNotice(reflectionEntries: ScoredMemoryEntry[]): string | undefined {
  if (reflectionEntries.length === 0) return undefined;
  return 'Ik heb gekeken wat er vorige keer gebeurde en pas mijn aanpak nu aan.';
}

export function buildUserNotice(topEntry?: ScoredMemoryEntry): string | undefined {
  if (!topEntry) return undefined;
  const summary = topEntry.entry.outcome || topEntry.entry.command;
  return `Ik herinner me dat ${topEntry.ageLabel} ${summary}`;
}
