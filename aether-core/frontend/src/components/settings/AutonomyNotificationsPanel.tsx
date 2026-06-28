import { Link } from 'react-router-dom';
import { Card, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';

type AutonomyNotificationKey = 'proactiveSuggestions' | 'autonomousLowRisk' | 'highRiskApproval';

export default function AutonomyNotificationsPanel() {
  const { settings, updateNotificationPrefs } = useMerchantSettings();
  const prefs = settings.notificationPrefs;

  const toggle = async (key: AutonomyNotificationKey, value: boolean) => {
    await updateNotificationPrefs({
      [key]: { ...prefs[key], inApp: value },
    });
  };

  const rows: Array<{ key: AutonomyNotificationKey; label: string; hint: string }> = [
    {
      key: 'proactiveSuggestions',
      label: t('settings.autonomyNotifications.proactive'),
      hint: t('settings.autonomyNotifications.proactiveHint'),
    },
    {
      key: 'autonomousLowRisk',
      label: t('settings.autonomyNotifications.autonomous'),
      hint: t('settings.autonomyNotifications.autonomousHint'),
    },
    {
      key: 'highRiskApproval',
      label: t('settings.autonomyNotifications.approvals'),
      hint: t('settings.autonomyNotifications.approvalsHint'),
    },
  ];

  return (
    <Card className="rounded-2xl border-border/30 bg-card/50 p-6" data-testid="autonomy-notifications">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomyNotifications.title')}
      </h3>
      <p className="text-meta text-muted-foreground mb-4">
        {t('settings.autonomyNotifications.subtitle')}
      </p>

      {rows.map((row) => (
        <SettingRow key={row.key} label={row.label} description={row.hint}>
          <Switch
            checked={prefs[row.key].inApp}
            onCheckedChange={(v) => void toggle(row.key, v)}
            aria-label={row.label}
          />
        </SettingRow>
      ))}

      <Link
        to="/settings?section=notifications"
        className="inline-block mt-4 text-meta text-primary hover:underline"
      >
        {t('settings.autonomyNotifications.viewAll')}
      </Link>
    </Card>
  );
}
