import { useId, useState } from 'react';
import React from 'react';
import {
  Button,
  Card,
  RangeInput,
  SegmentedControl,
  SettingRow,
  Switch,
} from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { GoalPursuitMode } from '@/lib/settings/merchantSettingsTypes';

export default function GoalPursuitSection() {
  const { settings, updateSettings } = useMerchantSettings();
  const [draft, setDraft] = useState(settings.goalPrefs);
  const [saving, setSaving] = useState(false);
  const enabledId = useId();
  const autoExecId = useId();
  const showWidgetId = useId();

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.goalPrefs);

  React.useEffect(() => {
    setDraft(settings.goalPrefs);
  }, [settings.goalPrefs]);

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ goalPrefs: { ...draft } });
    } finally {
      setSaving(false);
    }
  };

  const pursuitOptions: { value: GoalPursuitMode; label: string }[] = [
    { value: 'conservative', label: t('goals.pursuit.conservative') },
    { value: 'balanced', label: t('goals.pursuit.balanced') },
    { value: 'aggressive', label: t('goals.pursuit.aggressive') },
  ];

  return (
    <Card className="rounded-2xl border-border/30 bg-card/50 p-6">
      <h3 className="text-base font-semibold text-foreground mb-1">{t('settings.goals.title')}</h3>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.goals.subtitle')}</p>

      <div className="space-y-5">
        <SettingRow
          id={enabledId}
          label={t('settings.goals.enabled')}
          description={t('settings.goals.enabledHint')}
        >
          <Switch
            id={enabledId}
            checked={draft.enabled}
            onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
          />
        </SettingRow>

        <RangeInput
          label={t('settings.goals.maxActive')}
          value={draft.maxActive}
          onChange={(maxActive) => setDraft((d) => ({ ...d, maxActive }))}
          min={1}
          max={20}
        />

        <SegmentedControl
          label={t('settings.goals.defaultPursuit')}
          value={draft.defaultPursuitMode}
          onChange={(v) =>
            setDraft((d) => ({ ...d, defaultPursuitMode: v as GoalPursuitMode }))
          }
          options={pursuitOptions}
        />

        <SettingRow
          id={autoExecId}
          label={t('settings.goals.allowGoalAutoExecute')}
          description={t('settings.goals.allowGoalAutoExecuteHint')}
        >
          <Switch
            id={autoExecId}
            checked={draft.allowGoalLinkedAutoExecute}
            onCheckedChange={(allowGoalLinkedAutoExecute) =>
              setDraft((d) => ({ ...d, allowGoalLinkedAutoExecute }))
            }
          />
        </SettingRow>

        <SettingRow
          id={showWidgetId}
          label={t('settings.goals.showOnCommandCenter')}
          description={t('settings.goals.showOnCommandCenterHint')}
        >
          <Switch
            id={showWidgetId}
            checked={draft.showOnCommandCenter}
            onCheckedChange={(showOnCommandCenter) =>
              setDraft((d) => ({ ...d, showOnCommandCenter }))
            }
          />
        </SettingRow>

        <SettingRow
          label={t('settings.goals.federatedContribute')}
          description={t('settings.goals.federatedContributeHint')}
        >
          <Switch
            checked={draft.allowFederatedContribution}
            onCheckedChange={(allowFederatedContribution) =>
              setDraft((d) => ({ ...d, allowFederatedContribution }))
            }
          />
        </SettingRow>

        <SettingRow
          label={t('settings.goals.showGlobalHints')}
          description={t('settings.goals.showGlobalHintsHint')}
        >
          <Switch
            checked={draft.showGlobalHints}
            onCheckedChange={(showGlobalHints) =>
              setDraft((d) => ({ ...d, showGlobalHints }))
            }
          />
        </SettingRow>

        <Button onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? t('settings.save.saving') : t('settings.save')}
        </Button>
      </div>
    </Card>
  );
}
