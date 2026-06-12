import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';
import { formatDate, t } from '@/lib/i18n';
import { relatedRowLinkKey } from '@/lib/activityRelated';
import { Badge, ConfidenceChip, RiskBadge } from '@/components/ui';
import type { ActivityItem, ActivityStatus } from '@/types/activity';
import type { RiskBand } from '@/lib/intentNavigation';

function statusVariant(status: ActivityStatus): 'default' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'autonomous':
      return 'success';
    case 'approved':
      return 'default';
    case 'rejected':
      return 'danger';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

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
}

export default function ActivityRowCard({ item, onSelect }: ActivityRowCardProps) {
  const band = riskToBand(item.risk);
  const at = new Date(item.at);
  const timeStr = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const linkKey = relatedRowLinkKey(item);
  const href = relatedHref(item);
  const relatedLabel = linkKey ? t(linkKey) : null;
  const rowLabel = relatedLabel
    ? `${item.description}, ${item.actionLabel}, ${timeStr}. ${relatedLabel}`
    : `${item.description}, ${item.actionLabel}, ${timeStr}`;

  return (
    <article
      data-testid={`activity-row-${item.id}`}
      className={cn(
        'w-full rounded-xl border border-border/35 bg-card/40 border-l-[3px] pl-4 pr-4 py-4',
        borderAccent(item),
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
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-caption text-muted-foreground">{timeStr}</span>
              <span className="text-caption text-muted-foreground" aria-hidden>
                ·
              </span>
              <span className="text-meta text-muted-foreground uppercase tracking-wide text-[10px]">
                {item.actionLabel}
              </span>
            </div>
            <p className="text-body font-medium text-foreground leading-snug">{item.description}</p>
            {item.impact && (
              <p className="text-caption text-muted-foreground mt-1.5">
                {item.impact.label}: <span className="text-foreground/90">{item.impact.value}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={statusVariant(item.status)}>
              {t(`activity.status.${item.status}`)}
            </Badge>
            {band && <RiskBadge band={band} />}
            {item.confidence != null && item.confidence > 0 && (
              <ConfidenceChip confidence={item.confidence} />
            )}
          </div>
        </div>
      </button>

      {linkKey && href && (
        <Link
          to={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            'inline-flex items-center gap-1 mt-2 text-caption text-primary/90 hover:underline pointer-events-auto',
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
          aria-hidden
          className="inline-flex items-center gap-1 mt-2 text-caption text-primary/90 pointer-events-none"
          data-testid={`activity-row-link-${item.id}`}
        >
          {t(linkKey)}
          <ChevronRight size={12} aria-hidden />
        </span>
      )}
    </article>
  );
}
