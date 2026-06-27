import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { InsightCard, Button, RiskBadge, ConfidenceBadge, ApprovalDialog } from '@/components/ui';
import { AutonomyModeBadge } from '@/components/command-center/primitives';
import ExplainDrawer from '@/components/ExplainDrawer';
import { cn, interactiveSurface } from '@/lib/utils';
import { formatDate, t } from '@/lib/i18n';
import type { EnrichedApproval } from '@/lib/approvalPresentation';

interface EmailPayload {
  emailId?: string;
}

function toEmailPayload(payload: Record<string, unknown>): EmailPayload {
  return payload as EmailPayload;
}

interface ApprovalCardProps {
  enriched: EnrichedApproval;
  selected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  resolving?: boolean;
  readOnly?: boolean;
  outcomeLabel?: string;
  /** When false, approve/reject are hidden for high-risk items. */
  allowHighRiskActions?: boolean;
  highlighted?: boolean;
}

export default function ApprovalCard({
  enriched,
  selected,
  onToggleSelect,
  showCheckbox,
  onApprove,
  onReject,
  resolving,
  readOnly,
  outcomeLabel,
  allowHighRiskActions = true,
  highlighted = false,
}: ApprovalCardProps) {
  const navigate = useNavigate();
  const [explainOpen, setExplainOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const {
    item,
    title,
    impact,
    rationale,
    riskBand,
    confidence,
    urgencyLabel,
    accent,
    deepLink,
    executionMode,
    ktSnippets,
  } = enriched;
  const email = toEmailPayload(item.payload);
  const entityId = email.emailId ?? item.id;
  const isHighRisk = riskBand === 'high';
  const actionsReadOnly = readOnly || (isHighRisk && !allowHighRiskActions);

  const handleApproveClick = () => {
    if (isHighRisk && !actionsReadOnly) {
      setConfirmOpen(true);
      return;
    }
    onApprove(item.id);
  };

  const handleRejectClick = () => {
    if (isHighRisk && !actionsReadOnly) {
      setRejectConfirmOpen(true);
      return;
    }
    onReject(item.id);
  };

  const handleAdjust = () => {
    if (deepLink) navigate(deepLink.path, { state: deepLink.state });
    else setExplainOpen(true);
  };

  const handleViewActivity = () => {
    navigate('/timeline', { state: { presetCategory: 'approval' } });
  };

  const actionFooter = !actionsReadOnly ? (
    <div className="flex flex-wrap gap-2 w-full">
      <Button
        variant="success"
        size="md"
        disabled={resolving}
        onClick={handleApproveClick}
        data-testid={`approval-approve-${item.id}`}
      >
        {t('approval.approveAndExecute')}
      </Button>
      <Button variant="ghost" size="md" disabled={resolving} onClick={handleAdjust}>
        {deepLink ? t(deepLink.labelKey) : t('approval.adjust')}
      </Button>
      {!deepLink && (
        <Button variant="ghost" size="md" disabled={resolving} onClick={handleViewActivity}>
          {t('approval.viewActivity')}
        </Button>
      )}
      <Button
        variant="danger"
        size="md"
        disabled={resolving}
        onClick={handleRejectClick}
        data-testid={`approval-reject-${item.id}`}
      >
        {t('approval.reject')}
      </Button>
      <Button variant="ghost" size="md" onClick={() => setExplainOpen(true)}>
        <HelpCircle size={16} className="inline mr-1" />
        {t('approval.moreDetails')}
      </Button>
    </div>
  ) : isHighRisk && !allowHighRiskActions ? (
    <p className="text-caption text-muted-foreground/80">{t('approvals.highRisk.viewerHint')}</p>
  ) : undefined;

  return (
    <>
      <div
        className={cn(
          'flex gap-4 transition-opacity duration-fast',
          actionsReadOnly && 'opacity-80',
          resolving && !actionsReadOnly && 'opacity-70',
          highlighted && 'ring-2 ring-primary/50 rounded-2xl',
        )}
        data-testid={`approval-card-${item.id}`}
      >
        {showCheckbox && !actionsReadOnly && (
          <label className="flex items-start pt-8 shrink-0 cursor-pointer">
            <span className="sr-only">
              {t('approvals.bulk.selectItem').replace('{title}', title)}
            </span>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              data-testid={`approval-select-${item.id}`}
              className="rounded border-border/50"
              aria-label={t('approvals.bulk.selectItem').replace('{title}', title)}
            />
          </label>
        )}
        <InsightCard
          title={title}
          accent={accent}
          className={cn(
            interactiveSurface('flex-1 min-w-0'),
            "[&_[class*='pt-6']]:pt-4 [&_[class*='py-5']]:py-3",
            !actionsReadOnly && !resolving && 'hover:border-border/45',
          )}
          footer={actionFooter}
        >
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge band={riskBand} />
            <ConfidenceBadge confidence={confidence} />
            <AutonomyModeBadge mode={executionMode} />
            {outcomeLabel && (
              <span className="text-[11px] text-muted-foreground">{outcomeLabel}</span>
            )}
          </div>
          <p className="text-meta text-muted-foreground">{impact}</p>
          <p className="text-body text-muted-foreground/80 line-clamp-2">{rationale}</p>
          {ktSnippets && ktSnippets.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground/75 list-disc list-inside">
              {ktSnippets.map((snippet) => (
                <li key={snippet}>{snippet}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground">
            <span>{formatDate(item.createdAt)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className={cn(enriched.urgency === 'critical' && 'text-warning')}>
              {urgencyLabel}
            </span>
          </div>
        </InsightCard>
      </div>

      <ApprovalDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={title}
        detail={impact}
        riskBand={riskBand}
        confidence={confidence}
        loading={resolving}
        onConfirm={() => {
          setConfirmOpen(false);
          onApprove(item.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      <ApprovalDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        gateTitle={t('approval.gate.rejectTitle')}
        title={title}
        detail={impact}
        riskBand={riskBand}
        confidence={confidence}
        loading={resolving}
        confirmLabel={t('approval.reject')}
        confirmVariant="danger"
        onConfirm={() => {
          setRejectConfirmOpen(false);
          onReject(item.id);
        }}
        onCancel={() => setRejectConfirmOpen(false)}
      />

      <ExplainDrawer
        entityType={email.emailId ? 'email' : 'approval'}
        entityId={entityId}
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
      />
    </>
  );
}
