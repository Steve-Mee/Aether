import { useEffect, useState } from 'react';
import React from 'react';
import { t } from '@/lib/i18n';
import { getTimeGreetingKey } from '@/lib/buildHomeLandingViewModel';
import { useCurrentUser } from '@/lib/auth/AuthProvider';
import { firstNameFromDisplayName } from '@/lib/auth/userDisplay';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';

interface HomeWelcomeHeaderProps {
  tenantDisplayName?: string | null;
}

export default function HomeWelcomeHeader({ tenantDisplayName }: HomeWelcomeHeaderProps) {
  const { settings } = useMerchantSettings();
  const currentUser = useCurrentUser();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greetingKey = getTimeGreetingKey(now.getHours());
  const greeting = t(greetingKey);
  const userFirst = firstNameFromDisplayName(currentUser?.name);
  const name = userFirst ?? tenantDisplayName?.trim() ?? null;
  const title = name ? `${greeting}, ${name}` : greeting;

  const locale = settings.locale === 'en' ? 'en-GB' : 'nl-NL';
  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="mb-2" data-testid="home-welcome-header">
      <h1 className="text-headline font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="text-meta text-caption-accessible mt-1.5 capitalize">
        {dateStr}
        <span className="text-muted-foreground mx-2">·</span>
        <span className="tabular-nums">{timeStr}</span>
      </p>
    </header>
  );
}
