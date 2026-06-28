import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { relatedRowLinkKey, itemHasExplainability } from '@/lib/activityRelated';
import { Button, ConfidenceChip, RiskBadge } from '@/components/ui';
import { ActivityStatusBadge, AgentKeyBadges } from '@/components/intelligence';
import type { ActivityItem } from '@/types/activity';
import type { RiskBand } from '@/lib/intentNavigation';

function riskToBand(risk: ActivityItem['risk']): RiskBand | null {
  if (risk === 'high') return 'high';
  if (risk === 'low') return 'low';
  return null;
}

function borderAccent(item: ActivityItem): string {
  if (item.status === 'pending' || item.risk === 'high') {
    return 'border-l-warning/50';
  }
  if (item.status === 'autonomous' || item.executor === 'aether') {
    return 'border-l-success/40';
  }
  if (item.status === 'rejected') {
    return 'border-l-danger/50';
  }
  return 'border-l-border/50';
}

function rowBackground(item: ActivityItem): string {
  if (item.status === 'pending') return 'bg-warning/8';
  if (item.status === 'autonomous') return 'bg-success/8';
  return '';
}

function relatedHref(item: ActivityItem): string | null {
  if (!item.related) return null;
  switch (item.related.type) {
    case 'insight':
      return '/insights';
    case 'email':
      return '/emails';
    case 'approval':
      return null;
    default:
      return null;
  }
}

interface ActivityRowCardProps {
  item: ActivityItem;
  onSelect: () => void;
  showInlineExplain?: boolean;
  onExplain?: (item: ActivityItem) => void;
}

export default function ActivityRowCard({
  item,
  onSelect,
  showInlineExplain = false,
  onExplain,
}: ActivityRowCardProps) {
  const band = riskToBand(item.risk);
  const at = new Date(item.at);
  const timeStr = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const linkKey = relatedRowLinkKey(item);
  const href = relatedHref(item);
  const relatedLabel = linkKey ? t(linkKey) : null;
  const executorLabel =
    item.executor === 'aether' ? t('activity.executor.aether') : t('activity.executor.merchant');
  const rowLabel = relatedLabel
    ? `${item.description}, ${item.actionLabel}, ${timeStr}. ${relatedLabel}`
    : `${item.description}, ${item.actionLabel}, ${timeStr}`;
  const canInlineExplain = showInlineExplain && onExplain && itemHasExplainability(item);

  return (
    <article
      data-testid={`activity-row-${item.id}`}
      className={cn(
        'w-full rounded-xl border border-border/35 bg-card/40 border-l-[3px] pl-4 pr-4 py-4 transition-colors duration-fast',
        borderAccent(item),
        rowBackground(item),
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={rowLabel}
        className={cn(
          'w-full text-left cursor-pointer hover:bg-card/70 rounded-lg -mx-1 px-1 py-0.5',
          focusRing(),
        )}
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            {item.agentKeys && item.agentKeys.length > 0 && (
              <AgentKeyBadges agentKeys={item.agentKeys} />
            )}
            <p className="text-sm font-medium text-foreground leading-snug">{item.description}</p>
            <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              <span className="tabular-nums">{timeStr}</span>
              <span aria-hidden>·</span>
              <span className="text-[10px] uppercase tracking-wide">{item.actionLabel}</span>
              <span aria-hidden>·</span>
              <span className="text-[10px]">{executorLabel}</span>
            </div>
            {item.impact && (
              <p className="text-caption text-muted-foreground">
                {item.impact.label}: <span className="text-foreground/90">{item.impact.value}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <ActivityStatusBadge status={item.status} />
            {band && <RiskBadge band={band} />}
            {item.confidence != null && item.confidence > 0 && (
              <ConfidenceChip confidence={item.confidence} />
            )}
            <ChevronRight size={14} className="text-muted-foreground/50 mt-1" aria-hidden />
          </div>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 mt-1">
        {canInlineExplain && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            data-testid={`activity-row-explain-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onExplain(item);
            }}
          >
            {t('explain.why')}
          </Button>
        )}
        {linkKey && href && (
          <Link
            to={href}
            className={cn(
              'inline-flex items-center gap-1 text-caption text-primary/90 hover:underline',
              focusRing('rounded px-0.5'),
            )}
            data-testid={`activity-row-link-${item.id}`}
          >
            {t(linkKey)}
            <ChevronRight size={12} aria-hidden />
          </Link>
        )}
        {linkKey && !href && (
          <span
            className="inline-flex items-center gap-1 text-caption text-primary/90"
            data-testid={`activity-row-link-${item.id}`}
          >
            {t(linkKey)}
            <ChevronRight size={12} aria-hidden />
          </span>
        )}
      </div>
    </article>
  );
}
