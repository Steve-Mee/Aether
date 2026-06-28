import { createContext, useContext, type ReactNode } from 'react';
import { getLocale, setLocale, type Locale } from '../i18n';
import { useMerchantSettings } from './MerchantSettingsContext';

interface LocaleContextValue {
  locale: Locale;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'nl' });

/** Syncs i18n module locale with merchant settings and re-renders the tree on change. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { settings } = useMerchantSettings();
  setLocale(settings.locale);
  return (
    <LocaleContext.Provider value={{ locale: settings.locale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useLocaleLabel(): string {
  const locale = useLocale();
  return locale === 'nl' ? 'Nederlands' : 'English';
}

export { getLocale };
