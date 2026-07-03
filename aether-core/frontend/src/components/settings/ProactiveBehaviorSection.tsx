import { useId, useState } from 'react';
import React from 'react';
import { Button, Card, RangeInput, SegmentedControl, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { ProactiveVisibility } from '@/lib/settings/merchantSettingsTypes';

export default function ProactiveBehaviorSection() {
  const { settings, updateSettings } = useMerchantSettings();
  const [draft, setDraft] = useState(settings.proactivePrefs);
  const [saving, setSaving] = useState(false);
  const enabledId = useId();
  const autoExecId = useId();

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.proactivePrefs);

  React.useEffect(() => {
    setDraft(settings.proactivePrefs);
  }, [settings.proactivePrefs]);

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        proactivePrefs: {
          ...draft,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  const visibilityOptions: { value: ProactiveVisibility; label: string }[] = [
    { value: 'off', label: 'Uit' },
    { value: 'low_risk_only', label: 'Alleen low-risk' },
    { value: 'all', label: 'Alle suggesties' },
  ];

  return (
    <Card className="rounded-2xl border-border/30 bg-card/50 p-6">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.proactive.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.proactive.subtitle')}</p>

      <div className="space-y-5">
        <SettingRow
          htmlFor={enabledId}
          label={t('settings.proactive.enabled')}
          description={t('settings.proactive.enabledHint')}
        >
          <Switch
            id={enabledId}
            checked={draft.enabled}
            onCheckedChange={(checked) => setDraft((d) => ({ ...d, enabled: checked }))}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.proactive.visibility')}
          description={t('settings.proactive.visibilityHint')}
        >
          <SegmentedControl
            value={draft.visibility}
            options={visibilityOptions.map((opt) => ({
              ...opt,
              disabled: !draft.enabled,
            }))}
            onChange={(value) =>
              setDraft((d) => ({ ...d, visibility: value as ProactiveVisibility }))
            }
            aria-label={t('settings.proactive.visibility')}
          />
        </SettingRow>

        {draft.enabled && draft.visibility !== 'off' && (
          <SettingRow
            htmlFor={autoExecId}
            label={t('settings.proactive.allowAutoExecute')}
            description={t('settings.proactive.allowAutoExecuteHint')}
          >
            <Switch
              id={autoExecId}
              checked={draft.allowAutoExecute}
              onCheckedChange={(checked) => setDraft((d) => ({ ...d, allowAutoExecute: checked }))}
            />
          </SettingRow>
        )}

        <SettingRow
          label={t('settings.proactive.maxActive')}
          description={t('settings.proactive.maxActiveHint')}
        >
          <RangeInput
            min={1}
            max={10}
            value={draft.maxActive}
            onChange={(e) => setDraft((d) => ({ ...d, maxActive: Number(e.target.value) }))}
            disabled={!draft.enabled}
          />
        </SettingRow>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('settings.proactive.categories')}
          </p>
          {(['prijs', 'leverancier', 'voorraad', 'algemeen'] as const).map((key) => (
            <SettingRow key={key} label={t(`settings.proactive.category.${key}`)}>
              <Switch
                checked={draft.categories[key]}
                onCheckedChange={(checked) =>
                  setDraft((d) => ({
                    ...d,
                    categories: { ...d.categories, [key]: checked },
                  }))
                }
                disabled={!draft.enabled}
              />
            </SettingRow>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
          {t('settings.autonomy.save')}
        </Button>
      </div>
    </Card>
  );
}
