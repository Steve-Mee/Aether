import { useId, useState } from 'react';
import React from 'react';
import {
  Button,
  Card,
  RangeInput,
  SegmentedControl,
  SettingRow,
  Switch,
  TimeInput,
} from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { AutonomyLevel, AutoRunWindow, BrainActionMode, BrainKnowledgeGovernanceMode, BrainKnowledgeUpdateProfile } from '@/lib/settings/merchantSettingsTypes';

export default function AutonomyRiskSection() {
  const { settings, updateSettings } = useMerchantSettings();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const policyId = useId();
  const autoLowId = useId();
  const autoMailId = useId();
  const marginRangeId = useId();
  const priceRangeId = useId();
  const adaptiveLearnId = useId();
  const adaptiveAutoExecId = useId();
  const crossTenantPatternsId = useId();
  const federatedExecutionId = useId();

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        autonomyLevel: draft.autonomyLevel,
        policyEnabled: draft.policyEnabled,
        autoApproveLowRisk: draft.autoApproveLowRisk,
        autoApproveMediumRiskMail: draft.autoApproveMediumRiskMail,
        maxMarginImpactEuro: draft.maxMarginImpactEuro,
        maxAutoPriceChangePct: draft.maxAutoPriceChangePct,
        autoRunWindow: draft.autoRunWindow,
        autoRunWindowStart: draft.autoRunWindowStart,
        autoRunWindowEnd: draft.autoRunWindowEnd,
        brainActionMode: draft.brainActionMode,
        brainKnowledgeUpdateProfile: draft.brainKnowledgeUpdateProfile,
        brainKnowledgeTransferEnabled: draft.brainKnowledgeTransferEnabled,
        brainKnowledgeGovernanceMode: draft.brainKnowledgeGovernanceMode,
        brainFederatedContributionEnabled: draft.brainFederatedContributionEnabled,
        brainCrossTenantAgentPatternsEnabled: draft.brainCrossTenantAgentPatternsEnabled,
        brainFederatedExecutionContribute: draft.brainFederatedExecutionContribute,
        brainAdaptiveLearningEnabled: draft.brainAdaptiveLearningEnabled,
        brainAdaptiveAutoExecuteEnabled: draft.brainAdaptiveAutoExecuteEnabled,
      });
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const levelOptions: { value: AutonomyLevel; label: string }[] = [
    { value: 'low', label: t('settings.autonomy.levelLow') },
    { value: 'medium', label: t('settings.autonomy.levelMedium') },
    { value: 'high', label: t('settings.autonomy.levelHigh') },
  ];

  const windowOptions: { value: AutoRunWindow; label: string }[] = [
    { value: 'always', label: t('settings.autonomy.autoRunAlways') },
    { value: 'outside_office', label: t('settings.autonomy.autoRunOutside') },
    { value: 'custom', label: t('settings.autonomy.autoRunCustom') },
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

  const knowledgeTransferOptions: { value: 'inherit' | 'on' | 'off'; label: string }[] = [
    { value: 'inherit', label: t('settings.autonomy.knowledgeTransferInherit') },
    { value: 'on', label: t('settings.autonomy.knowledgeTransferOn') },
    { value: 'off', label: t('settings.autonomy.knowledgeTransferOff') },
  ];

  const governanceOptions: { value: BrainKnowledgeGovernanceMode; label: string }[] = [
    { value: 'full_loop', label: t('settings.autonomy.governanceFullLoop') },
    { value: 'receive_only', label: t('settings.autonomy.governanceReceiveOnly') },
    { value: 'contribute_only', label: t('settings.autonomy.governanceContributeOnly') },
  ];

  const knowledgeTransferValue =
    draft.brainKnowledgeTransferEnabled === null || draft.brainKnowledgeTransferEnabled === undefined
      ? 'inherit'
      : draft.brainKnowledgeTransferEnabled
        ? 'on'
        : 'off';

  const marginHint = t('settings.autonomy.maxMarginHintDynamic').replace(
    '{max}',
    `€${draft.maxMarginImpactEuro}`,
  );

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-autonomy">
      <h2 className="text-title font-semibold text-foreground mb-6">
        {t('settings.section.autonomy')}
      </h2>

      <SettingRow
        label={t('settings.autonomy.level')}
        description={t('settings.autonomy.levelHint')}
      >
        <SegmentedControl
          options={levelOptions}
          value={draft.autonomyLevel}
          onChange={(v) => setDraft((d) => ({ ...d, autonomyLevel: v }))}
          data-testid="autonomy-level"
          aria-label={t('settings.autonomy.level')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.policyEnabled')}
        description={t('settings.autonomy.policyEnabledHint')}
        htmlFor={policyId}
      >
        <Switch
          id={policyId}
          checked={draft.policyEnabled}
          onCheckedChange={(v) => setDraft((d) => ({ ...d, policyEnabled: v }))}
          data-testid="policy-enabled"
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
          onCheckedChange={(v) => setDraft((d) => ({ ...d, autoApproveLowRisk: v }))}
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
          onCheckedChange={(v) => setDraft((d) => ({ ...d, autoApproveMediumRiskMail: v }))}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.maxMargin')}
        description={marginHint}
        htmlFor={marginRangeId}
      >
        <RangeInput
          id={marginRangeId}
          min={50}
          max={5000}
          step={50}
          value={draft.maxMarginImpactEuro}
          onChange={(e) => setDraft((d) => ({ ...d, maxMarginImpactEuro: Number(e.target.value) }))}
          valueLabel={`€${draft.maxMarginImpactEuro}`}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.maxPricePct')}
        description={t('settings.autonomy.maxPricePctHint')}
        htmlFor={priceRangeId}
      >
        <RangeInput
          id={priceRangeId}
          min={1}
          max={25}
          step={1}
          value={draft.maxAutoPriceChangePct}
          onChange={(e) =>
            setDraft((d) => ({ ...d, maxAutoPriceChangePct: Number(e.target.value) }))
          }
          valueLabel={`${draft.maxAutoPriceChangePct}%`}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.brainActionMode')}
        description={t('settings.autonomy.brainActionModeHint')}
      >
        <SegmentedControl
          options={brainModeOptions}
          value={draft.brainActionMode}
          onChange={(v) => setDraft((d) => ({ ...d, brainActionMode: v }))}
          data-testid="brain-action-mode"
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
          onChange={(v) => setDraft((d) => ({ ...d, brainKnowledgeUpdateProfile: v }))}
          data-testid="brain-knowledge-profile"
          aria-label={t('settings.autonomy.knowledgeUpdateProfile')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.knowledgeTransfer')}
        description={t('settings.autonomy.knowledgeTransferHint')}
      >
        <SegmentedControl
          options={knowledgeTransferOptions}
          value={knowledgeTransferValue}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              brainKnowledgeTransferEnabled:
                v === 'inherit' ? null : v === 'on',
            }))
          }
          data-testid="brain-knowledge-transfer"
          aria-label={t('settings.autonomy.knowledgeTransfer')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.knowledgeGovernance')}
        description={t('settings.autonomy.knowledgeGovernanceHint')}
      >
        <SegmentedControl
          options={governanceOptions}
          value={draft.brainKnowledgeGovernanceMode}
          onChange={(v) => setDraft((d) => ({ ...d, brainKnowledgeGovernanceMode: v }))}
          data-testid="brain-knowledge-governance"
          aria-label={t('settings.autonomy.knowledgeGovernance')}
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.federatedContribution')}
        description={t('settings.autonomy.federatedContributionHint')}
        htmlFor="federated-contribution"
      >
        <Switch
          id="federated-contribution"
          checked={draft.brainFederatedContributionEnabled}
          onCheckedChange={(v) =>
            setDraft((d) => ({ ...d, brainFederatedContributionEnabled: v }))
          }
          data-testid="brain-federated-contribution"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.crossTenantPatterns')}
        description={t('settings.autonomy.crossTenantPatternsHint')}
        htmlFor={crossTenantPatternsId}
      >
        <Switch
          id={crossTenantPatternsId}
          checked={draft.brainCrossTenantAgentPatternsEnabled}
          onCheckedChange={(v) =>
            setDraft((d) => ({ ...d, brainCrossTenantAgentPatternsEnabled: v }))
          }
          data-testid="brain-cross-tenant-patterns"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.federatedExecutionContribute')}
        description={t('settings.autonomy.federatedExecutionContributeHint')}
        htmlFor={federatedExecutionId}
      >
        <Switch
          id={federatedExecutionId}
          checked={draft.brainFederatedExecutionContribute}
          onCheckedChange={(v) =>
            setDraft((d) => ({ ...d, brainFederatedExecutionContribute: v }))
          }
          data-testid="brain-federated-execution-contribute"
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
          onCheckedChange={(v) => setDraft((d) => ({ ...d, brainAdaptiveLearningEnabled: v }))}
          data-testid="brain-adaptive-learning"
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
          onCheckedChange={(v) => setDraft((d) => ({ ...d, brainAdaptiveAutoExecuteEnabled: v }))}
          data-testid="brain-adaptive-auto-execute"
        />
      </SettingRow>

      <SettingRow
        label={t('settings.autonomy.autoRunWindow')}
        description={
          draft.autoRunWindow === 'outside_office'
            ? t('settings.autonomy.autoRunOutsideHint')
            : t('settings.autonomy.autoRunHint')
        }
      >
        <SegmentedControl
          options={windowOptions}
          value={draft.autoRunWindow}
          onChange={(v) => setDraft((d) => ({ ...d, autoRunWindow: v }))}
          data-testid="auto-run-window"
          aria-label={t('settings.autonomy.autoRunWindow')}
        />
      </SettingRow>

      {draft.autoRunWindow === 'custom' && (
        <div className="flex flex-wrap gap-4 py-4 border-b border-border/30">
          <label className="text-sm">
            <span className="text-muted-foreground block mb-1">
              {t('settings.autonomy.windowStart')}
            </span>
            <TimeInput
              value={draft.autoRunWindowStart ?? '18:00'}
              onChange={(e) => setDraft((d) => ({ ...d, autoRunWindowStart: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground block mb-1">
              {t('settings.autonomy.windowEnd')}
            </span>
            <TimeInput
              value={draft.autoRunWindowEnd ?? '08:00'}
              onChange={(e) => setDraft((d) => ({ ...d, autoRunWindowEnd: e.target.value }))}
            />
          </label>
        </div>
      )}

      <div className="pt-6">
        <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={save}>
          {t('settings.autonomy.save')}
        </Button>
      </div>
    </Card>
  );
}
