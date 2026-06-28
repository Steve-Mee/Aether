import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { apiFetch, apiRoutes } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { AutonomyCustomRule } from '@/lib/settings/autonomyTypes';
import { AUTONOMY_AGENT_KEYS } from '@/lib/settings/autonomyTypes';

export interface AutonomySimulateResult {
  assessment: {
    executionMode: string;
    eligible: boolean;
    reason: string;
    reasonCode: string;
    riskClass: string;
    category: string | null;
  };
  trace: Array<{ step: string; passed: boolean; reason?: string; reasonCode?: string }>;
  matchedRuleId?: string;
  settingsSnapshot: { preset: string; autonomyLevel: string; policyEnabled: boolean };
}

const SIMULATOR_ACTIONS = [
  { id: 'price_update', module: 'admin-command-bar', actionType: 'price.change', labelKey: 'settings.autonomy.simulator.actionPrice' },
  { id: 'mail_reply', module: 'aether-mail', actionType: 'email.auto_reply', labelKey: 'settings.autonomy.simulator.actionMail' },
  { id: 'supplier_sync', module: 'supplier-intelligence', actionType: 'supplier.monitor', labelKey: 'settings.autonomy.simulator.actionSupplier' },
  { id: 'restock', module: 'admin-command-bar', actionType: 'inventory.restock', labelKey: 'settings.autonomy.simulator.actionInventory' },
  { id: 'promotion', module: 'admin-command-bar', actionType: 'promotion.suggest', labelKey: 'settings.autonomy.simulator.actionPromotion' },
] as const;

function modeBadgeClass(mode: string): string {
  if (mode === 'autonomous') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (mode === 'blocked') return 'bg-red-500/15 text-red-700 dark:text-red-300';
  return 'bg-amber-500/15 text-amber-800 dark:text-amber-200';
}

function modeLabel(mode: string): string {
  if (mode === 'autonomous') return t('settings.autonomy.simulator.badgeAutonomous');
  if (mode === 'blocked') return t('settings.autonomy.simulator.badgeBlocked');
  if (mode === 'approval_required') return t('settings.autonomy.simulator.badgeApproval');
  return t('settings.autonomy.simulator.badgeInform');
}

interface Props {
  prefill?: {
    marginImpact?: number;
    priceChangePct?: number;
    agentKey?: string;
    simulateAt?: string;
  };
}

export default function AutonomySimulatorPanel({ prefill }: Props) {
  const [actionId, setActionId] = useState<(typeof SIMULATOR_ACTIONS)[number]['id']>(
    SIMULATOR_ACTIONS[0].id,
  );
  const [marginImpact, setMarginImpact] = useState(prefill?.marginImpact ?? 50);
  const [priceChangePct, setPriceChangePct] = useState(prefill?.priceChangePct ?? 2);
  const [agentKey, setAgentKey] = useState(prefill?.agentKey ?? '');
  const [simulateAt, setSimulateAt] = useState(prefill?.simulateAt ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutonomySimulateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = SIMULATOR_ACTIONS.find((a) => a.id === actionId) ?? SIMULATOR_ACTIONS[0];

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        marginImpact,
        priceChangePct,
        percentage: priceChangePct,
      };
      const body: Record<string, unknown> = {
        module: selected.module,
        actionType: selected.actionType,
        payload,
      };
      if (agentKey) body.agentKey = agentKey;
      if (simulateAt) body.simulateAt = new Date(simulateAt).toISOString();

      const res = await apiFetch<AutonomySimulateResult>(apiRoutes.admin.autonomySimulate, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('settings.autonomy.simulator.error'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="autonomy-simulator-panel">
      <h3 className="text-base font-semibold text-foreground mb-1">
        {t('settings.autonomy.simulator.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.autonomy.simulator.subtitle')}</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <label className="text-sm block">
          <span className="text-muted-foreground block mb-1">
            {t('settings.autonomy.simulator.actionType')}
          </span>
          <select
            className="w-full rounded-md border border-border/40 bg-background px-3 py-2"
            value={actionId}
            onChange={(e) =>
              setActionId(e.target.value as (typeof SIMULATOR_ACTIONS)[number]['id'])
            }
          >
            {SIMULATOR_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {t(a.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm block">
          <span className="text-muted-foreground block mb-1">
            {t('settings.autonomy.simulator.agentOptional')}
          </span>
          <select
            className="w-full rounded-md border border-border/40 bg-background px-3 py-2"
            value={agentKey}
            onChange={(e) => setAgentKey(e.target.value)}
          >
            <option value="">{t('settings.autonomy.simulator.agentNone')}</option>
            {AUTONOMY_AGENT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`settings.autonomy.agents.${k}.label`)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm block">
          <span className="text-muted-foreground block mb-1">
            {t('settings.autonomy.simulator.marginImpact')}
          </span>
          <input
            type="number"
            min={0}
            className="w-full rounded-md border border-border/40 bg-background px-3 py-2"
            value={marginImpact}
            onChange={(e) => setMarginImpact(Number(e.target.value))}
          />
        </label>

        <label className="text-sm block">
          <span className="text-muted-foreground block mb-1">
            {t('settings.autonomy.simulator.pricePct')}
          </span>
          <input
            type="number"
            min={0}
            max={100}
            className="w-full rounded-md border border-border/40 bg-background px-3 py-2"
            value={priceChangePct}
            onChange={(e) => setPriceChangePct(Number(e.target.value))}
          />
        </label>

        <label className="text-sm block sm:col-span-2">
          <span className="text-muted-foreground block mb-1">
            {t('settings.autonomy.simulator.simulateAt')}
          </span>
          <input
            type="datetime-local"
            className="w-full max-w-sm rounded-md border border-border/40 bg-background px-3 py-2"
            value={simulateAt}
            onChange={(e) => setSimulateAt(e.target.value)}
          />
        </label>
      </div>

      <Button variant="primary" size="sm" disabled={loading} onClick={() => void runSimulation()}>
        {loading ? t('settings.autonomy.simulator.running') : t('settings.autonomy.simulator.run')}
      </Button>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-6 space-y-4" data-testid="autonomy-simulator-result">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${modeBadgeClass(result.assessment.executionMode)}`}
            >
              {modeLabel(result.assessment.executionMode)}
            </span>
            <span className="text-sm text-muted-foreground">{result.assessment.reason}</span>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{t('settings.autonomy.simulator.traceTitle')}</p>
            <ol className="space-y-2 text-sm">
              {result.trace.map((step, i) => (
                <li
                  key={`${step.step}-${i}`}
                  className={`rounded-lg px-3 py-2 border ${
                    step.passed ? 'border-border/30' : 'border-amber-500/40 bg-amber-500/5'
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground">{step.step}</span>
                  {step.reason && <span className="block mt-0.5">{step.reason}</span>}
                </li>
              ))}
            </ol>
          </div>

          {result.matchedRuleId && (
            <p className="text-sm text-muted-foreground">
              {t('settings.autonomy.simulator.matchedRule')}: {result.matchedRuleId}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function prefillFromRule(rule: AutonomyCustomRule): Props['prefill'] {
  const margin = rule.conditions.find((c) => c.field === 'marginImpactEuro');
  const pct = rule.conditions.find((c) => c.field === 'priceChangePct');
  const agent = rule.conditions.find((c) => c.field === 'agentKey');
  return {
    marginImpact: margin ? Number(margin.value) : undefined,
    priceChangePct: pct ? Number(pct.value) : undefined,
    agentKey: agent ? String(agent.value) : undefined,
  };
}
