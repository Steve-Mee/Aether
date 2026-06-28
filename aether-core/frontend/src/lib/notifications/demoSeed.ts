import type { NotificationPrefs } from '@/lib/settings/merchantSettingsTypes';
import type { AetherNotification } from './types';
import { shouldShowNotification } from './notificationPrefsFilter';

function minutesAgo(m: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - m);
  return d.toISOString();
}

export function getDemoNotificationSeed(): AetherNotification[] {
  return [
    {
      id: 'seed-1',
      title: 'Prijsdaling gedetecteerd',
      body: 'Nordic Supply Co. — 4 SKU met −6,8% inkoopprijs',
      severity: 'action',
      read: false,
      createdAt: minutesAgo(8),
      href: '/suppliers',
      actionLabel: 'Bekijk leverancier',
      source: 'system',
      category: 'supplier_change',
    },
    {
      id: 'seed-2',
      title: 'Autonome sync voltooid',
      body: 'Voorraad en prijzen gesynchroniseerd (142 SKU, Shopify)',
      severity: 'info',
      read: true,
      createdAt: minutesAgo(22),
      href: '/timeline',
      source: 'system',
      category: 'autonomous_low_risk',
    },
    {
      id: 'seed-3',
      title: 'Goedkeuring vereist',
      body: 'Terugbetaling € 89,50 — high-risk, wacht op jou',
      severity: 'action',
      read: false,
      createdAt: minutesAgo(35),
      href: '/approvals',
      actionLabel: 'Open goedkeuringen',
      source: 'system',
      category: 'high_risk_approval',
      kind: 'approval_needed',
      groupKey: 'approval-batch-demo',
      groupCount: 3,
    },
    {
      id: 'seed-4',
      title: 'Leverancier bijgewerkt',
      body: 'Berg & Berg Textiles — voorraadwijziging op 3 producten',
      severity: 'warning',
      read: true,
      createdAt: minutesAgo(48),
      href: '/suppliers',
      source: 'system',
      category: 'supplier_change',
    },
    {
      id: 'seed-5',
      title: 'Low-risk actie uitgevoerd',
      body: 'Outdoor & camping: +2,1% marge op 12 producten',
      severity: 'info',
      read: true,
      createdAt: minutesAgo(55),
      href: '/timeline',
      source: 'system',
      category: 'autonomous_low_risk',
    },
  ];
}

/** Initial inbox for live mode — empty when demo layers are disabled. */
export function resolveLiveNotificationSeed(opts: {
  hybridDemo: boolean;
  liveDemo: boolean;
}): AetherNotification[] {
  if (opts.hybridDemo || opts.liveDemo) return getDemoNotificationSeed();
  return [];
}

export function filterNotificationsByPrefs(
  items: AetherNotification[],
  prefs: NotificationPrefs,
): AetherNotification[] {
  return items.filter((item) => shouldShowNotification(prefs, item));
}
