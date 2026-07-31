import { enMessages } from './en';
import { nlMessages } from './nl';
import type { Locale, LocaleMessages } from './types';

export const messages: Record<Locale, LocaleMessages> = {
  nl: nlMessages,
  en: enMessages,
};
