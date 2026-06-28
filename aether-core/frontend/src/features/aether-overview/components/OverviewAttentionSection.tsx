import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button, RiskBadge } from '@/components/ui';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { SectionLabel } from '@/components/command-center/primitives';
import { t } from '@/lib/i18n';
import type { EnrichedApproval } from '@/lib/approvalPresentation';

interface OverviewApprovalRowProps {
  enriched: EnrichedApproval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  resolving?: boolean;
  highlighted?: boolean;
}

function OverviewApprovalRow({
  enriched,
  onApprove,
  onReject,
  resolving,
  highlighted,
}: OverviewApprovalRowProps) {
  const [explainOpen, setExplainOpen] = useState(false);
  const { item, title, rationale, riskBand } = enriched;

  return (
    <article
      className="rounded-xl border border-warning/25 bg-warning/5 border-l-[3px] border-l-warning/50 p-4 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-primary/40"
      data-testid={`overview-approval-${item.id}`}
      data-highlighted={highlighted ? 'true' : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge band={riskBand} />
            <span className="text-[10px] uppercase tracking-widest text-caption-accessible">
              {item.module}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {rationale && (
            <p className="text-xs text-muted-foreground line-clamp-2">{rationale}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={resolving}
            onClick={() => onApprove(item.id)}
          >
            {t('approval.approve')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={resolving}
            onClick={() => onReject(item.id)}
          >
            {t('approval.reject')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setExplainOpen(true)}
          >
            {t('explain.why')}
          </Button>
        </div>
      </div>
      <AgentExplainabilitySheet
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        entityType="approval"
        entityId={item.id}
      />
    </article>
  );
}

interface OverviewAttentionSectionProps {
  items: EnrichedApproval[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  resolvingId: string | null;
  highlightedId?: string | null;
}

export default function OverviewAttentionSection({
  items,
  onApprove,
  onReject,
  resolvingId,
  highlightedId,
}: OverviewAttentionSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8" data-testid="overview-attention-section">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <SectionLabel
            title={t('overview.section.attention')}
            subtitle={t('overview.section.attention.subtitle')}
          />
        </div>
        <Link
          to="/approvals"
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          <AlertTriangle size={14} aria-hidden />
          {t('overview.section.attention.viewAll')}
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((enriched) => (
          <OverviewApprovalRow
            key={enriched.item.id}
            enriched={enriched}
            onApprove={onApprove}
            onReject={onReject}
            resolving={resolvingId === enriched.item.id}
            highlighted={highlightedId === enriched.item.id}
          />
        ))}
      </div>
    </section>
  );
}
