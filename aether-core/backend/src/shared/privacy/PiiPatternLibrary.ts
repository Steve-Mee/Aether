export const PII_PATTERN_DEFINITIONS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'email', pattern: /\b[\w.-]+@[\w.-]+\.\w+\b/i },
  { id: 'phone_long', pattern: /\b\d{10,}\b/ },
  { id: 'iban', pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/i },
  { id: 'nl_bsn', pattern: /\b\d{9}\b/ },
  { id: 'nl_kvk', pattern: /\b\d{8}\b/ },
  { id: 'credit_card', pattern: /\b(?:\d[ -]*?){13,16}\b/ },
];

export function scanWithRegex(text: string): string[] {
  const hits: string[] = [];
  for (const { id, pattern } of PII_PATTERN_DEFINITIONS) {
    if (pattern.test(text)) hits.push(id);
  }
  return hits;
}
