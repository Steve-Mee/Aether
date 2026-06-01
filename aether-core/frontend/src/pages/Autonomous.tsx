import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import React from 'react';
import { apiFetch } from '../lib/api';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AutonomyTraceDrawer from '../components/AutonomyTraceDrawer';
import EmptyState from '../components/ui/EmptyState';
import { useAsyncData } from '../lib/useAsyncData';
import { formatDate, t } from '../lib/i18n';

interface DecisionRow {
  id: string;
  type: string;
  result: string;
  rationale: string | null;
  createdAt: string;
}

export default function Autonomous() {
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceDecision, setTraceDecision] = useState<DecisionRow | null>(null);
  const { data: decisions, error, loading, reload } = useAsyncData(() =>
    apiFetch<DecisionRow[]>('/api/autonomous')
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">{t('autonomous.title')}</h1>
        <FeatureStatusFromTruth featureKey="autonomous-operations" />
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {!decisions || decisions.length === 0 ? (
          <EmptyState title="Nog geen autonome beslissingen" />
        ) : (
          <div className="space-y-4">
            {decisions.map((d) => (
              <Card key={d.id} padding="md">
                <p className="font-medium text-[var(--color-text)]">{d.type}</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">{d.rationale ?? d.result}</p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-2">{formatDate(d.createdAt)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setTraceDecision(d);
                    setTraceOpen(true);
                  }}
                >
                  <HelpCircle size={14} className="inline mr-1" />
                  {t('approval.explain')}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>

      <AutonomyTraceDrawer
        open={traceOpen}
        onClose={() => {
          setTraceOpen(false);
          setTraceDecision(null);
        }}
        decisionTitle={traceDecision?.type}
        decisionDetail={traceDecision?.rationale ?? traceDecision?.result}
      />
    </div>
  );
}
