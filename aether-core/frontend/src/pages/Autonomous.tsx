import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import React from 'react';
import { Button, Card, EmptyState, ModuleListPageSkeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import AutonomyTraceDrawer from '../components/AutonomyTraceDrawer';
import { formatDate, t } from '../lib/i18n';
import { interactiveSurface } from '@/lib/utils';
import { useAutonomousPage, type AutonomousDecisionRow } from '@/hooks/useAutonomousPage';

export default function Autonomous() {
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceDecision, setTraceDecision] = useState<AutonomousDecisionRow | null>(null);
  const { decisions, error, loading, reload } = useAutonomousPage();

  return (
    <ModulePageLayout
      title={t('autonomous.title')}
      subtitle={t('autonomous.subtitle')}
      featureKey="autonomous-operations"
      testId="autonomous-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {!decisions || decisions.length === 0 ? (
        <EmptyState
          variant="premium"
          title={t('autonomous.empty.title')}
          description={t('autonomous.empty.description')}
        />
      ) : (
        <div className="space-y-4">
          {decisions.map((d) => (
            <Card key={d.id} padding="md" className={interactiveSurface()}>
              <p className="font-medium text-foreground">{d.type}</p>
              <p className="text-sm text-muted-foreground mt-1">{d.rationale ?? d.result}</p>
              <p className="text-xs text-muted-foreground mt-2">{formatDate(d.createdAt)}</p>
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

      <AutonomyTraceDrawer
        open={traceOpen}
        onClose={() => {
          setTraceOpen(false);
          setTraceDecision(null);
        }}
        decisionTitle={traceDecision?.type}
        decisionDetail={traceDecision?.rationale ?? traceDecision?.result}
      />
    </ModulePageLayout>
  );
}
