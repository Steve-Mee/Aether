import { useId, useState } from 'react';
import { Card, SegmentedControl, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import type {
  AutonomyLevel,
  BrainActionMode,
  BrainKnowledgeGovernanceMode,
  BrainKnowledgeUpdateProfile,
  MerchantSettings,
} from '@/lib/settings/merchantSettingsTypes';

interface Props {
  draft: MerchantSettings;
  onChange: (patch: Partial<MerchantSettings>) => void;
}

export default function AutonomyLowRiskPanel({ draft, onChange }: Props) {
  const autoLowId = useId();
  const autoMailId = useId();
  const adaptiveLearnId = useId();
  const adaptiveAutoExecId = useId();
  const [brainOpen, setBrainOpen] = useState(false);

  const levelOptions: { value: AutonomyLevel; label: string }[] = [
    { value: 'low', label: t('settings.autonomy.levelLow') },
    { value: 'medium', label: t('settings.autonomy.levelMedium') },
    { value: 'high', label: t('settings.autonomy.levelHigh') },
  ];

  const brainModeOptions: { value: BrainActionMode; label: string }[] = [
    { value: 'confirm_on_uncertain', label: t('settings.autonomy.brainModeUncertain') },
    { value: 'always_confirm', label: t('settings.autonomy.brainModeAlways') },
    { value: 'adaptive', label: t('settings.autonomy.brainModeAdaptive') },
  ];

  const knowledgeProfileOptions: { value: BrainKnowledgeUpdateProfile; label: string }[] = [
    { value: 'conservative', label: t('settings.autonomy.knowledgeProfileConservative') },
    { value: 'balanced', label: t('settings.autonomy.knowledgeProfileBalanced') },
    { value: 'aggressive', label: t('settings.autonomy.knowledgeProfileAggressive') },
  ];

  const governanceOptions: { value: BrainKnowledgeGovernanceMode; label: string }[] = [
    { value: 'full_loop', label: t('settings.autonomy.governanceFullLoop') },
    { value: 'receive_only', label: t('settings.autonomy.governanceReceiveOnly') },
    { value: 'contribute_only', label: t('settings.autonomy.governanceContributeOnly') },
  ];

  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-low-risk-panel">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.execution.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {t('settings.autonomy.execution.subtitle')}
      </p>

      <SettingRow
        label={t('settings.autonomy.level')}
        description={t('settings.autonomy.levelHint')}
      >
        <SegmentedControl
          options={levelOptions}
          value={draft.autonomyLevel}
          onChange={(v) =>
            onChange({
              autonomyLevel: v,
              autonomyPrefs: { ...draft.autonomyPrefs, preset: 'custom' },
            })
          }
          data-testid="autonomy-level"
          aria-label={t('settings.autonomy.level')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoLowRisk')}
        description={t('settings.autonomy.autoLowRiskHint')}
        htmlFor={autoLowId}
      >
        <Switch
          id={autoLowId}
          checked={draft.autoApproveLowRisk}
          onCheckedChange={(v) =>
            onChange({
              autoApproveLowRisk: v,
              autonomyPrefs: { ...draft.autonomyPrefs, preset: 'custom' },
            })
          }
          data-testid="auto-low-risk"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoMail')}
        description={t('settings.autonomy.autoMailHint')}
        htmlFor={autoMailId}
      >
        <Switch
          id={autoMailId}
          checked={draft.autoApproveMediumRiskMail}
          onCheckedChange={(v) =>
            onChange({
              autoApproveMediumRiskMail: v,
              autonomyPrefs: { ...draft.autonomyPrefs, preset: 'custom' },
            })
          }
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.adaptiveLearning')}
        description={t('settings.autonomy.adaptiveLearningHint')}
        htmlFor={adaptiveLearnId}
      >
        <Switch
          id={adaptiveLearnId}
          checked={draft.brainAdaptiveLearningEnabled}
          onCheckedChange={(v) => onChange({ brainAdaptiveLearningEnabled: v })}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.adaptiveAutoExecute')}
        description={t('settings.autonomy.adaptiveAutoExecuteHint')}
        htmlFor={adaptiveAutoExecId}
      >
        <Switch
          id={adaptiveAutoExecId}
          checked={draft.brainAdaptiveAutoExecuteEnabled}
          onCheckedChange={(v) => onChange({ brainAdaptiveAutoExecuteEnabled: v })}
        />
      </SettingRow>

      <button
        type="button"
        className="mt-4 text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        onClick={() => setBrainOpen((o) => !o)}
      >
        {brainOpen
          ? t('settings.autonomy.brainAdvanced.hide')
          : t('settings.autonomy.brainAdvanced.show')}
      </button>

      {brainOpen && (
        <div className="mt-4 space-y-4 pt-4 border-t border-border/30">
          <SettingRow
            label={t('settings.autonomy.brainActionMode')}
            description={t('settings.autonomy.brainActionModeHint')}
          >
            <SegmentedControl
              options={brainModeOptions}
              value={draft.brainActionMode}
              onChange={(v) => onChange({ brainActionMode: v })}
              aria-label={t('settings.autonomy.brainActionMode')}
            />
          </SettingRow>

          <SettingRow
            label={t('settings.autonomy.knowledgeUpdateProfile')}
            description={t('settings.autonomy.knowledgeUpdateProfileHint')}
          >
            <SegmentedControl
              options={knowledgeProfileOptions}
              value={draft.brainKnowledgeUpdateProfile}
              onChange={(v) => onChange({ brainKnowledgeUpdateProfile: v })}
              aria-label={t('settings.autonomy.knowledgeUpdateProfile')}
            />
          </SettingRow>

          <SettingRow
            label={t('settings.autonomy.knowledgeGovernance')}
            description={t('settings.autonomy.knowledgeGovernanceHint')}
          >
            <SegmentedControl
              options={governanceOptions}
              value={draft.brainKnowledgeGovernanceMode}
              onChange={(v) => onChange({ brainKnowledgeGovernanceMode: v })}
              aria-label={t('settings.autonomy.knowledgeGovernance')}
            />
          </SettingRow>
        </div>
      )}
    </Card>
  );
}
