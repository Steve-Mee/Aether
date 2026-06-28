import { Link } from 'react-router-dom';
import { Clock, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';
import { formatDate, t } from '@/lib/i18n';
import {
  Button,
  ConfidenceChip,
  RiskBadge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui';
import { cn, focusRing } from '@/lib/utils';
import { approvalDetail } from '@/lib/navigation/moduleLinks';
import { canExplainApproval } from '@/lib/activityRelated';
import type { ActivityItem } from '@/types/activity';
import type { RiskBand } from '@/lib/intentNavigation';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import type { ExplainEntityType } from '@/types/explainability';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';

interface ActivityDetailSheetProps {
  item: ActivityItem | null;
  open: boolean;
  onClose: () => void;
}

function riskToBand(risk: ActivityItem['risk']): RiskBand | null {
  if (risk === 'high') return 'high';
  if (risk === 'low') return 'low';
  return null;
}

export default function ActivityDetailSheet({
  item,
  open,
  onClose,
}: ActivityDetailSheetProps) {
  const { settings } = useMerchantSettings();
  const [explainOpen, setExplainOpen] = useState(false);
  const [approvalExplainId, setApprovalExplainId] = useState<string | null>(null);

  if (!item) {
    return (
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent side="right" className="hidden" />
      </Sheet>
    );
  }

  const band = riskToBand(item.risk);
  const explainSourceType = item.details?.explainabilitySourceType;
  const explainSourceId = item.details?.explainabilitySourceId;
  const canShowExplain =
    settings.explainabilityPrefs.detailLevel !== 'off' &&
    typeof explainSourceType === 'string' &&
    typeof explainSourceId === 'string' &&
    (explainSourceType === 'command' || explainSourceType === 'proactive_suggestion');
  const detailEntries =
    item.details && typeof item.details === 'object'
      ? Object.entries(item.details).filter(
          ([k]) =>
            ![
              'entityId',
              'entityType',
              'explainabilitySourceType',
              'explainabilitySourceId',
            ].includes(k),
        )
      : [];

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        data-testid="activity-detail-sheet"
        className="flex flex-col w-full sm:max-w-md p-0 gap-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="flex-row items-center justify-between p-4 border-b border-border/40 space-y-0">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock size={18} className="text-primary/80" aria-hidden />
            {t('activity.detail.title')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <p className="text-meta text-muted-foreground uppercase tracking-wide text-[10px] mb-1">
              {item.actionLabel}
            </p>
            <p className="text-body font-medium text-foreground">{item.description}</p>
            <p className="text-caption text-muted-foreground mt-2">{formatDate(item.at)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {band && <RiskBadge band={band} />}
            <span className="text-caption text-muted-foreground px-2 py-1 rounded-lg bg-muted/30">
              {t(`activity.status.${item.status}`)}
            </span>
            <span className="text-caption text-muted-foreground px-2 py-1 rounded-lg bg-muted/30">
              {t(`activity.executor.${item.executor}`)}
            </span>
          </div>

          {item.confidence != null && item.confidence > 0 && (
            <div>
              <p className="text-caption text-muted-foreground mb-2">
                {t('activity.detail.confidence')}
              </p>
              <ConfidenceChip confidence={item.confidence} />
            </div>
          )}

          {item.rationale && (
            <div>
              <p className="text-caption text-muted-foreground mb-2">
                {t('activity.detail.rationale')}
              </p>
              <p className="text-body text-foreground/90 leading-relaxed">{item.rationale}</p>
            </div>
          )}

          {item.impact && (
            <div>
              <p className="text-caption text-muted-foreground mb-2">
                {t('activity.detail.impact')}
              </p>
              <p className="text-body">
                {item.impact.label}: <strong>{item.impact.value}</strong>
              </p>
            </div>
          )}

          {detailEntries.length > 0 && (
            <div>
              <p className="text-caption text-muted-foreground mb-2">{t('activity.detail.data')}</p>
              <ul className="space-y-1.5 text-sm text-foreground/85">
                {detailEntries.map(([key, val]) => (
                  <li key={key} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{key}:</span>
                    <span>{String(val)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 border-t border-border/30 space-y-3">
            {item.related?.type === 'approval' && (
              <div className="flex flex-col gap-2">
                {canExplainApproval(item.related) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setApprovalExplainId(item.related!.id)}
                    data-testid="activity-explain-approval"
                  >
                    {t('approval.explain')}
                  </Button>
                )}
                <Link
                  to={approvalDetail(item.related.id)}
                  className={cn(
                    'inline-flex items-center gap-2 text-sm text-primary hover:underline',
                    focusRing('rounded px-0.5'),
                  )}
                >
                  <ExternalLink size={14} aria-hidden />
                  {t('activity.detail.viewApproval')}
                </Link>
                {!canExplainApproval(item.related) && (
                  <p className="text-caption text-muted-foreground">
                    {t('activity.detail.demoHint')}
                  </p>
                )}
              </div>
            )}
            {item.related?.type === 'insight' && (
              <Link
                to="/insights"
                className={cn(
                  'inline-flex items-center gap-2 text-sm text-primary hover:underline',
                  focusRing('rounded px-0.5'),
                )}
              >
                <ExternalLink size={14} aria-hidden />
                {t('activity.detail.viewInsight')}
              </Link>
            )}
            {item.related?.type === 'email' && (
              <Link
                to="/emails"
                className={cn(
                  'inline-flex items-center gap-2 text-sm text-primary hover:underline',
                  focusRing('rounded px-0.5'),
                )}
              >
                <ExternalLink size={14} aria-hidden />
                {t('activity.detail.viewEmail')}
              </Link>
            )}
            {canShowExplain && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setExplainOpen(true)}
                data-testid="activity-explain-link"
              >
                {t('explain.viewFull')}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    {canShowExplain && (
      <AgentExplainabilitySheet
        entityType={explainSourceType as ExplainEntityType}
        entityId={String(explainSourceId)}
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
      />
    )}
    {approvalExplainId && (
      <AgentExplainabilitySheet
        entityType="approval"
        entityId={approvalExplainId}
        open
        onClose={() => setApprovalExplainId(null)}
      />
    )}
    </>
  );
}
