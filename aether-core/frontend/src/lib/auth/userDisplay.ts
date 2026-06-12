/** First token of display name for greetings (e.g. "Steve van …" → "Steve"). */
export function firstNameFromDisplayName(name: string | undefined | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}

/** Up to two initials for avatar chips. */
export function initialsFromDisplayName(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
