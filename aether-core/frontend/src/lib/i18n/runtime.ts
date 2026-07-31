import { assertMerchantCopy } from '../noPlaceholder';
import { messages } from './messages';
import type { Locale } from './types';

let currentLocale: Locale = 'nl';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string): string {
  const raw = messages[currentLocale][key] ?? messages.en[key] ?? key;
  if (import.meta.env.DEV) {
    return assertMerchantCopy(raw, `i18n:${key}`) || raw;
  }
  return raw;
}

/** Vrije merchant-copy met zero-placeholder guard in dev. */
export function merchantText(text: string, context: string): string {
  if (import.meta.env.DEV) {
    const checked = assertMerchantCopy(text, context);
    return checked || text;
  }
  return text;
}

export function formatDate(date: Date | string, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale ?? currentLocale);
}

export function formatCurrency(amount: number, locale?: Locale): string {
  const loc = locale ?? currentLocale;
  return new Intl.NumberFormat(loc === 'nl' ? 'nl-NL' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}
