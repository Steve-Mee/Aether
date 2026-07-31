import { useState } from 'react';
import React from 'react';
import { Button } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { AutonomyPreset } from '@/lib/settings/autonomyTypes';
import { applyAutonomyPreset } from '@/lib/settings/autonomyPresets';
import type { MerchantSettings } from '@/lib/settings/merchantSettingsTypes';
import AutonomyPresetSelector from './AutonomyPresetSelector';
import AutonomyGuardrailsPanel from './AutonomyGuardrailsPanel';
import AutonomyCategoryGrid from './AutonomyCategoryGrid';
import AutonomyAgentOverridesPanel from './AutonomyAgentOverridesPanel';
import AutonomyRulesPanel from './AutonomyRulesPanel';
import AutonomySimulatorPanel, { prefillFromRule } from './AutonomySimulatorPanel';
import AutonomyLowRiskPanel from './AutonomyLowRiskPanel';
import AutonomyNotificationsPanel from './AutonomyNotificationsPanel';
import type { AutonomyCustomRule } from '@/lib/settings/autonomyTypes';

export default function AutonomyConfigPanel() {
  const { settings, updateSettings } = useMerchantSettings();
  const [draft, setDraft] = useState<MerchantSettings>(settings);
  const [saving, setSaving] = useState(false);

  const [simulatorPrefill, setSimulatorPrefill] =
    useState<Parameters<typeof AutonomySimulatorPanel>[0]['prefill']>();

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const patchDraft = (patch: Partial<MerchantSettings>) => {
    setDraft((d) => ({
      ...d,
      ...patch,
      proactivePrefs: patch.proactivePrefs
        ? { ...d.proactivePrefs, ...patch.proactivePrefs }
        : d.proactivePrefs,
      goalPrefs: patch.goalPrefs ? { ...d.goalPrefs, ...patch.goalPrefs } : d.goalPrefs,
      autonomyPrefs: patch.autonomyPrefs
        ? {
            ...d.autonomyPrefs,
            ...patch.autonomyPrefs,
            actionCategories: patch.autonomyPrefs.actionCategories
              ? { ...d.autonomyPrefs.actionCategories, ...patch.autonomyPrefs.actionCategories }
              : d.autonomyPrefs.actionCategories,
            agentOverrides: patch.autonomyPrefs.agentOverrides
              ? { ...d.autonomyPrefs.agentOverrides, ...patch.autonomyPrefs.agentOverrides }
              : d.autonomyPrefs.agentOverrides,
            customRules: patch.autonomyPrefs.customRules ?? d.autonomyPrefs.customRules,
          }
        : d.autonomyPrefs,
    }));
  };

  const applyPreset = (preset: Exclude<AutonomyPreset, 'custom'>) => {
    const bundle = applyAutonomyPreset(preset);
    setDraft((d) => ({
      ...d,
      ...bundle,
      autonomyLevel: bundle.autonomyLevel ?? d.autonomyLevel,
      policyEnabled: bundle.policyEnabled ?? d.policyEnabled,
      autoApproveLowRisk: bundle.autoApproveLowRisk ?? d.autoApproveLowRisk,
      autoApproveMediumRiskMail: bundle.autoApproveMediumRiskMail ?? d.autoApproveMediumRiskMail,
      autonomyPrefs: bundle.autonomyPrefs ?? d.autonomyPrefs,
      proactivePrefs: {
        ...d.proactivePrefs,
        ...(bundle.proactivePrefs ?? {}),
      },
      goalPrefs: {
        ...d.goalPrefs,
        ...(bundle.goalPrefs ?? {}),
      },
    }));
  };

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
        brainKnowledgeGovernanceMode: draft.brainKnowledgeGovernanceMode,
        brainAdaptiveLearningEnabled: draft.brainAdaptiveLearningEnabled,
        brainAdaptiveAutoExecuteEnabled: draft.brainAdaptiveAutoExecuteEnabled,
        autonomyPrefs: draft.autonomyPrefs,
        proactivePrefs: {
          ...draft.proactivePrefs,
          allowAutoExecute: draft.proactivePrefs.allowAutoExecute,
        },
        goalPrefs: {
          ...draft.goalPrefs,
          defaultPursuitMode: draft.goalPrefs.defaultPursuitMode,
          allowGoalLinkedAutoExecute: draft.goalPrefs.allowGoalLinkedAutoExecute,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-autonomy">
      <AutonomyPresetSelector
        preset={draft.autonomyPrefs.preset}
        onPresetChange={applyPreset}
        draft={draft}
      />
      <AutonomyGuardrailsPanel draft={draft} onChange={patchDraft} />
      <AutonomyCategoryGrid
        autonomyPrefs={draft.autonomyPrefs}
        onChange={(autonomyPrefs) => patchDraft({ autonomyPrefs })}
        disabled={!draft.policyEnabled}
      />
      <AutonomyAgentOverridesPanel
        autonomyPrefs={draft.autonomyPrefs}
        onChange={(autonomyPrefs) => patchDraft({ autonomyPrefs })}
        disabled={!draft.policyEnabled}
      />
      <AutonomyRulesPanel
        autonomyPrefs={draft.autonomyPrefs}
        onChange={(autonomyPrefs) => patchDraft({ autonomyPrefs })}
        disabled={!draft.policyEnabled}
        onTestRule={(rule: AutonomyCustomRule) => setSimulatorPrefill(prefillFromRule(rule))}
      />
      <AutonomySimulatorPanel prefill={simulatorPrefill} />
      <AutonomyLowRiskPanel draft={draft} onChange={patchDraft} />
      <AutonomyNotificationsPanel />

      <div className="flex justify-end">
        <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {t('settings.autonomy.save')}
        </Button>
      </div>
    </div>
  );
}
