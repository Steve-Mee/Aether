import { useState } from 'react';
import { Button, Card, SettingRow, Switch } from '@/components/ui';
import { t } from '@/lib/i18n';
import {
  MAX_AUTONOMY_CUSTOM_RULES,
  type AutonomyCustomRule,
  type AutonomyPrefs,
  type AutonomyRuleCondition,
  type RuleOutcome,
} from '@/lib/settings/autonomyTypes';

interface Props {
  autonomyPrefs: AutonomyPrefs;
  onChange: (prefs: AutonomyPrefs) => void;
  onTestRule?: (rule: AutonomyCustomRule) => void;
  disabled?: boolean;
}

const RULE_TEMPLATES: Array<{ nameKey: string; rule: Omit<AutonomyCustomRule, 'id'> }> = [
  {
    nameKey: 'settings.autonomy.rules.templateSmallPrice',
    rule: {
      enabled: true,
      name: 'Kleine prijsaanpassing auto',
      sortOrder: 0,
      outcome: 'allow_auto',
      conditions: [
        { field: 'priceChangePct', operator: 'lte', value: 3 },
        { field: 'category', operator: 'eq', value: 'pricing' },
      ],
    },
  },
  {
    nameKey: 'settings.autonomy.rules.templateLargeMargin',
    rule: {
      enabled: true,
      name: 'Grote marge altijd goedkeuren',
      sortOrder: 1,
      outcome: 'require_approval',
      conditions: [{ field: 'marginImpactEuro', operator: 'gt', value: 500 }],
    },
  },
];

function outcomeBadge(outcome: RuleOutcome): string {
  if (outcome === 'allow_auto') return t('settings.autonomy.rules.outcomeAuto');
  if (outcome === 'block') return t('settings.autonomy.rules.outcomeBlock');
  return t('settings.autonomy.rules.outcomeApproval');
}

function newRuleId(): string {
  return `rule_${Date.now().toString(36)}`;
}

export default function AutonomyRulesPanel({
  autonomyPrefs,
  onChange,
  onTestRule,
  disabled,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rules = autonomyPrefs.customRules ?? [];
  const atLimit = rules.length >= MAX_AUTONOMY_CUSTOM_RULES;

  const updateRules = (next: AutonomyCustomRule[]) => {
    onChange({ ...autonomyPrefs, preset: 'custom', customRules: next });
  };

  const addTemplate = (template: (typeof RULE_TEMPLATES)[number]) => {
    if (atLimit) return;
    const rule: AutonomyCustomRule = {
      ...template.rule,
      id: newRuleId(),
      name: t(template.nameKey),
      sortOrder: rules.length,
    };
    updateRules([...rules, rule]);
    setExpandedId(rule.id);
  };

  const patchRule = (id: string, patch: Partial<AutonomyCustomRule>) => {
    updateRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRule = (id: string) => {
    updateRules(rules.filter((r) => r.id !== id));
  };

  const patchCondition = (ruleId: string, index: number, patch: Partial<AutonomyRuleCondition>) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const conditions = rule.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    patchRule(ruleId, { conditions });
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-rules-panel">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.rules.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{t('settings.autonomy.rules.subtitle')}</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {RULE_TEMPLATES.map((tpl) => (
          <Button
            key={tpl.nameKey}
            variant="secondary"
            size="sm"
            disabled={disabled || atLimit}
            onClick={() => addTemplate(tpl)}
          >
            {t(tpl.nameKey)}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || atLimit}
          onClick={() =>
            addTemplate({
              nameKey: 'settings.autonomy.rules.newRule',
              rule: {
                enabled: true,
                name: t('settings.autonomy.rules.newRule'),
                sortOrder: rules.length,
                outcome: 'require_approval',
                conditions: [{ field: 'marginImpactEuro', operator: 'lte', value: 100 }],
              },
            })
          }
        >
          {t('settings.autonomy.rules.addRule')}
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('settings.autonomy.rules.empty')}</p>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-xl border border-border/30 p-4"
            data-testid={`autonomy-rule-${rule.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={rule.enabled}
                  disabled={disabled}
                  onCheckedChange={(enabled) => patchRule(rule.id, { enabled })}
                />
                <div>
                  <p className="font-medium text-foreground">{rule.name}</p>
                  <span className="text-xs text-muted-foreground">{outcomeBadge(rule.outcome)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {onTestRule && (
                  <Button variant="ghost" size="sm" onClick={() => onTestRule(rule)}>
                    {t('settings.autonomy.rules.testRule')}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}>
                  {expandedId === rule.id ? t('settings.autonomy.brainAdvanced.hide') : t('settings.autonomy.rules.edit')}
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={() => removeRule(rule.id)}>
                  {t('settings.autonomy.rules.remove')}
                </Button>
              </div>
            </div>

            {expandedId === rule.id && (
              <div className="mt-4 space-y-3 border-t border-border/30 pt-4">
                <SettingRow label={t('settings.autonomy.rules.ruleName')}>
                  <input
                    className="rounded-md border border-border/40 bg-background px-3 py-2 text-sm w-full max-w-xs"
                    value={rule.name}
                    disabled={disabled}
                    onChange={(e) => patchRule(rule.id, { name: e.target.value })}
                  />
                </SettingRow>
                <SettingRow label={t('settings.autonomy.rules.outcome')}>
                  <select
                    className="rounded-md border border-border/40 bg-background px-3 py-2 text-sm"
                    value={rule.outcome}
                    disabled={disabled}
                    onChange={(e) => patchRule(rule.id, { outcome: e.target.value as RuleOutcome })}
                  >
                    <option value="allow_auto">{t('settings.autonomy.rules.outcomeAuto')}</option>
                    <option value="require_approval">{t('settings.autonomy.rules.outcomeApproval')}</option>
                    <option value="block">{t('settings.autonomy.rules.outcomeBlock')}</option>
                  </select>
                </SettingRow>
                {rule.conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-end text-sm">
                    <span className="text-muted-foreground">{t('settings.autonomy.rules.if')}</span>
                    <select
                      className="rounded-md border border-border/40 bg-background px-2 py-1"
                      value={cond.field}
                      disabled={disabled}
                      onChange={(e) =>
                        patchCondition(rule.id, idx, {
                          field: e.target.value as AutonomyRuleCondition['field'],
                        })
                      }
                    >
                      <option value="marginImpactEuro">{t('settings.autonomy.rules.fieldMargin')}</option>
                      <option value="priceChangePct">{t('settings.autonomy.rules.fieldPricePct')}</option>
                      <option value="category">{t('settings.autonomy.rules.fieldCategory')}</option>
                      <option value="riskClass">{t('settings.autonomy.rules.fieldRisk')}</option>
                      <option value="agentKey">{t('settings.autonomy.rules.fieldAgent')}</option>
                    </select>
                    <select
                      className="rounded-md border border-border/40 bg-background px-2 py-1"
                      value={cond.operator}
                      disabled={disabled}
                      onChange={(e) =>
                        patchCondition(rule.id, idx, {
                          operator: e.target.value as AutonomyRuleCondition['operator'],
                        })
                      }
                    >
                      <option value="gt">&gt;</option>
                      <option value="gte">≥</option>
                      <option value="lt">&lt;</option>
                      <option value="lte">≤</option>
                      <option value="eq">=</option>
                    </select>
                    <input
                      className="rounded-md border border-border/40 bg-background px-2 py-1 w-24"
                      value={String(cond.value)}
                      disabled={disabled}
                      onChange={(e) => patchCondition(rule.id, idx, { value: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
