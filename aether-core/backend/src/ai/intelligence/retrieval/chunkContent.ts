/** Split long text into searchable chunks for vector indexing/recall. */
export function chunkContent(text: string, maxLen = 512): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return [trimmed];

  const paragraphs = trimmed.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 1 && paragraphs.every((p) => p.length <= maxLen)) {
    return paragraphs;
  }

  const chunks: string[] = [];
  for (let i = 0; i < trimmed.length; i += maxLen) {
    chunks.push(trimmed.slice(i, i + maxLen));
  }
  return chunks;
}
