import { Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { composeInsights, type ProposedInsight } from '../../lib/insightComposer';
import { filterSnoozed, snoozeInsight } from '../../lib/insightSnooze';
import { useDashboard } from '../../lib/DashboardContext';
import { useCommand } from '../../lib/CommandContext';
import { apiFetch } from '../../lib/api';
import { t } from '../../lib/i18n';
import InsightCard from './InsightCard';
import EmptyStatePremium from '../ui/EmptyStatePremium';
import ApprovalGateModal from '../approvals/ApprovalGateModal';

export default function ActionProposalStack() {
  const { data, reload } = useDashboard();
  const { executeCommand, openPalette } = useCommand();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gateInsight, setGateInsight] = useState<ProposedInsight | null>(null);

  const [snoozeVersion, setSnoozeVersion] = useState(0);
  const insights = useMemo(
    () => (data ? filterSnoozed(composeInsights(data)) : []),
    [data, snoozeVersion]
  );

  const runInsight = async (insight: ProposedInsight) => {
    if (insight.requiresApproval && insight.riskBand !== 'low') {
      setGateInsight(insight);
      return;
    }
    await executeInsight(insight);
  };

  const executeInsight = async (insight: ProposedInsight) => {
    setLoading(true);
    try {
      if (insight.actionType === 'command' && insight.command) {
        await executeCommand(insight.command);
      } else if (insight.actionType === 'auto_apply') {
        await apiFetch<{ applied: number }>('/api/approvals/auto-apply', { method: 'POST' });
        reload();
      } else if (insight.href) {
        navigate(insight.href);
      }
    } finally {
      setLoading(false);
      setGateInsight(null);
    }
  };

  return (
    <section aria-label={t('cockpit.insights.title')}>
      <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-[var(--color-text)]">
        <Sparkles size={18} className="text-[var(--color-accent)]" />
        {t('cockpit.insights.title')}
      </h2>

      {insights.length === 0 ? (
        <EmptyStatePremium
          title={t('cockpit.insights.empty')}
          description="Gebruik ⌘K of typ een commando hierboven."
          actionLabel={t('command.palette.title')}
          onAction={openPalette}
        />
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onExecute={runInsight}
              onSnooze={(i) => {
                snoozeInsight(i.id);
                setSnoozeVersion((n) => n + 1);
              }}
              loading={loading}
            />
          ))}
        </div>
      )}

      <ApprovalGateModal
        open={!!gateInsight}
        title={gateInsight?.title ?? ''}
        detail={gateInsight?.detail ?? ''}
        riskBand={gateInsight?.riskBand ?? 'medium'}
        confidence={gateInsight?.confidence ?? 0.5}
        onConfirm={() => gateInsight && executeInsight(gateInsight)}
        onCancel={() => setGateInsight(null)}
        loading={loading}
      />
    </section>
  );
}
