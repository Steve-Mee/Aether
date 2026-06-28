import { Card, RangeInput, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import {
  AUTONOMY_AGENT_KEYS,
  defaultAgentOverride,
  type AgentAutonomyOverride,
  type AutonomyAgentKey,
  type AutonomyPrefs,
} from '@/lib/settings/autonomyTypes';

interface Props {
  autonomyPrefs: AutonomyPrefs;
  onChange: (prefs: AutonomyPrefs) => void;
  disabled?: boolean;
}

type TriState = 'inherit' | 'on' | 'off';

function triFromBool(val: boolean | null | undefined): TriState {
  if (val === true) return 'on';
  if (val === false) return 'off';
  return 'inherit';
}

function boolFromTri(state: TriState): boolean | null {
  if (state === 'on') return true;
  if (state === 'off') return false;
  return null;
}

function getOverride(prefs: AutonomyPrefs, key: AutonomyAgentKey): AgentAutonomyOverride {
  return prefs.agentOverrides[key] ?? defaultAgentOverride();
}

function patchAgent(
  prefs: AutonomyPrefs,
  key: AutonomyAgentKey,
  patch: Partial<AgentAutonomyOverride>,
): AutonomyPrefs {
  return {
    ...prefs,
    preset: 'custom',
    agentOverrides: {
      ...prefs.agentOverrides,
      [key]: { ...getOverride(prefs, key), ...patch },
    },
  };
}

function TriToggle({
  value,
  disabled,
  onChange,
  testId,
}: {
  value: TriState;
  disabled?: boolean;
  onChange: (v: TriState) => void;
  testId?: string;
}) {
  const options: TriState[] = ['inherit', 'on', 'off'];
  return (
    <div className="flex gap-1" data-testid={testId}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          className={`px-2 py-1 text-xs rounded-md border ${
            value === opt
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border/40 text-muted-foreground'
          }`}
          onClick={() => onChange(opt)}
        >
          {t(`settings.autonomy.agents.tri.${opt}`)}
        </button>
      ))}
    </div>
  );
}

export default function AutonomyAgentOverridesPanel({ autonomyPrefs, onChange, disabled }: Props) {
  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-agent-overrides">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.agents.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.autonomy.agents.subtitle')}</p>

      <div className="space-y-4">
        {AUTONOMY_AGENT_KEYS.map((agentKey) => {
          const ov = getOverride(autonomyPrefs, agentKey);
          return (
            <div
              key={agentKey}
              className="rounded-xl border border-border/30 p-4 space-y-3"
              data-testid={`autonomy-agent-${agentKey}`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-foreground">
                    {t(`settings.autonomy.agents.${agentKey}.label`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`settings.autonomy.agents.${agentKey}.hint`)}
                  </p>
                </div>
                <SettingRow label={t('settings.autonomy.agents.enabled')}>
                  <Switch
                    checked={ov.enabled}
                    disabled={disabled}
                    onCheckedChange={(enabled) =>
                      onChange(patchAgent(autonomyPrefs, agentKey, { enabled }))
                    }
                  />
                </SettingRow>
              </div>

              <SettingRow
                label={t('settings.autonomy.agents.priority')}
                description={t('settings.autonomy.agents.priorityHint')}
              >
                <RangeInput
                  min={1}
                  max={10}
                  step={1}
                  value={ov.priority}
                  disabled={disabled || !ov.enabled}
                  onChange={(e) =>
                    onChange(
                      patchAgent(autonomyPrefs, agentKey, { priority: Number(e.target.value) }),
                    )
                  }
                  valueLabel={String(ov.priority)}
                />
              </SettingRow>

              <SettingRow label={t('settings.autonomy.category.lowRiskAuto')}>
                <TriToggle
                  value={triFromBool(ov.allowLowRiskAutoExecute)}
                  disabled={disabled || !ov.enabled}
                  testId={`agent-${agentKey}-low`}
                  onChange={(state) =>
                    onChange(
                      patchAgent(autonomyPrefs, agentKey, {
                        allowLowRiskAutoExecute: boolFromTri(state),
                      }),
                    )
                  }
                />
              </SettingRow>

              <SettingRow label={t('settings.autonomy.category.mediumRiskAuto')}>
                <TriToggle
                  value={triFromBool(ov.allowMediumRiskAutoExecute)}
                  disabled={disabled || !ov.enabled}
                  testId={`agent-${agentKey}-medium`}
                  onChange={(state) =>
                    onChange(
                      patchAgent(autonomyPrefs, agentKey, {
                        allowMediumRiskAutoExecute: boolFromTri(state),
                      }),
                    )
                  }
                />
              </SettingRow>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
