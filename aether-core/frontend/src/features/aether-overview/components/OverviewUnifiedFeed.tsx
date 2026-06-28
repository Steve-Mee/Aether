import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityRowCard from '@/components/activity-page/ActivityRowCard';
import ActivityDetailSheet from '@/components/activity-page/ActivityDetailSheet';
import { Button, EmptyState } from '@/components/ui';
import { SectionLabel } from '@/components/command-center/primitives';
import {
  GoalStatusBadge,
  ProactiveSuggestionCard,
  type ProactiveSuggestionCardData,
} from '@/components/intelligence';
import GoalProgressBar from '@/components/goals/GoalProgressBar';
import { enrichApproval } from '@/lib/approvalPresentation';
import type { ActionExecutionMode } from '@/lib/actionAutonomy';
import { t } from '@/lib/i18n';
import type { OverviewFeedItem } from '../types/overviewFeed';
import { activityFromOverviewItem } from '../types/overviewFeed';
import type { ActivityItem } from '@/types/activity';
import type { ApprovalItem } from '@/types/approval';
import type { GoalStatus, MerchantGoal } from '@/types/goals';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';

interface OverviewUnifiedFeedProps {
  items: OverviewFeedItem[];
  selected: ActivityItem | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  filteredEmpty: boolean;
  onClearFilters?: () => void;
  highlightedId?: string | null;
  onProactiveExecute?: (id: string) => void;
  onProactiveDismiss?: (id: string) => void;
  onProactiveSnooze?: (id: string) => void;
  proactiveExecutingId?: string | null;
  proactiveStreaming?: boolean;
  showProactiveAutoExecute?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  resolvingApprovalId?: string | null;
}

function proactiveFromPayload(payload: Record<string, unknown>): ProactiveSuggestionCardData | null {
  const id = String(payload.id ?? '');
  if (!id) return null;
  return {
    id,
    title: String(payload.label ?? payload.title ?? id),
    impactHint: payload.hint ? String(payload.hint) : undefined,
    category: String(payload.category ?? 'marge'),
    executionMode: (payload.executionMode as ActionExecutionMode) ?? 'inform_only',
    hasExplainability: payload.hasExplainability !== false,
  };
}

function goalFromPayload(payload: Record<string, unknown>): Partial<MerchantGoal> | null {
  const id = String(payload.id ?? '');
  if (!id) return null;
  return {
    id,
    title: String(payload.title ?? id),
    progressPct: typeof payload.progressPct === 'number' ? payload.progressPct : null,
    status: (payload.status as GoalStatus) ?? 'active',
    deadline: String(payload.deadline ?? new Date().toISOString()),
  };
}

function CompactApprovalRow({
  item,
  onApprove,
  onReject,
  resolving,
  highlighted,
}: {
  item: ApprovalItem;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  resolving?: boolean;
  highlighted?: boolean;
}) {
  const [explainOpen, setExplainOpen] = useState(false);
  const enriched = enrichApproval(item);

  return (
    <article
      className="rounded-xl border border-warning/25 bg-warning/5 border-l-[3px] border-l-warning/50 p-3.5 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-primary/40"
      data-testid={`overview-feed-approval-${item.id}`}
      data-highlighted={highlighted ? 'true' : undefined}
    >
      <p className="text-sm font-medium text-foreground mb-2">{enriched.title}</p>
      <div className="flex flex-wrap gap-1.5">
        {onApprove && (
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={resolving}
            onClick={() => onApprove(item.id)}
          >
            {t('approval.approve')}
          </Button>
        )}
        {onReject && (
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
        )}
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
      <AgentExplainabilitySheet
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        entityType="approval"
        entityId={item.id}
        title={enriched.title}
      />
    </article>
  );
}

function UnifiedRow({
  item,
  onSelect,
  highlightedId,
  onProactiveExecute,
  onProactiveDismiss,
  onProactiveSnooze,
  proactiveExecutingId,
  proactiveStreaming,
  showProactiveAutoExecute,
  onApprove,
  onReject,
  resolvingApprovalId,
}: {
  item: OverviewFeedItem;
  onSelect: (id: string) => void;
  highlightedId?: string | null;
  onProactiveExecute?: (id: string) => void;
  onProactiveDismiss?: (id: string) => void;
  onProactiveSnooze?: (id: string) => void;
  proactiveExecutingId?: string | null;
  proactiveStreaming?: boolean;
  showProactiveAutoExecute?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  resolvingApprovalId?: string | null;
}) {
  const [explainOpen, setExplainOpen] = useState(false);

  if (item.kind === 'activity') {
    const activity = activityFromOverviewItem(item);
    if (!activity) return null;
    return (
      <div data-highlighted={highlightedId === item.id ? 'true' : undefined}>
        <ActivityRowCard item={activity} onSelect={() => onSelect(item.id)} />
      </div>
    );
  }

  if (item.kind === 'proactive') {
    const suggestion = proactiveFromPayload(item.payload);
    if (!suggestion || !onProactiveExecute) return null;
    return (
      <>
        <ProactiveSuggestionCard
          suggestion={suggestion}
          layout="list"
          showAetherLabel={false}
          highlighted={highlightedId === item.id}
          executing={proactiveExecutingId === suggestion.id}
          streaming={proactiveStreaming ?? false}
          showAutoExecute={showProactiveAutoExecute}
          onExecute={() => onProactiveExecute(suggestion.id)}
          onExplain={() => setExplainOpen(true)}
          onDismiss={() => onProactiveDismiss?.(suggestion.id)}
          onSnooze={() => onProactiveSnooze?.(suggestion.id)}
          onAutoExecute={() => onProactiveExecute(suggestion.id)}
        />
        <AgentExplainabilitySheet
          entityType="proactive_suggestion"
          entityId={suggestion.id}
          title={suggestion.title}
          open={explainOpen}
          onClose={() => setExplainOpen(false)}
        />
      </>
    );
  }

  if (item.kind === 'approval') {
    const approval = item.payload as unknown as ApprovalItem;
    if (!approval?.id) return null;
    return (
      <CompactApprovalRow
        item={approval}
        onApprove={onApprove}
        onReject={onReject}
        resolving={resolvingApprovalId === approval.id}
        highlighted={highlightedId === item.id}
      />
    );
  }

  if (item.kind === 'goal_snapshot') {
    const goal = goalFromPayload(item.payload);
    if (!goal?.id) return null;
    return (
      <article
        data-testid={`overview-feed-goal_snapshot-${goal.id}`}
        data-highlighted={highlightedId === item.id ? 'true' : undefined}
        className="rounded-xl border border-border/35 bg-card/40 p-3.5 space-y-2 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-primary/40"
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/goals/${goal.id}`}
            className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
          >
            {goal.title}
          </Link>
          <GoalStatusBadge status={goal.status ?? 'active'} progressPct={goal.progressPct} />
        </div>
        <GoalProgressBar
          value={goal.progressPct ?? 0}
          variant={
            goal.status === 'completed'
              ? 'completed'
              : (goal.progressPct ?? 0) < 50
                ? 'behind'
                : 'default'
          }
        />
      </article>
    );
  }

  return null;
}

export default function OverviewUnifiedFeed({
  items,
  selected,
  selectedId,
  onSelect,
  onCloseDetail,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  filteredEmpty,
  onClearFilters,
  highlightedId,
  onProactiveExecute,
  onProactiveDismiss,
  onProactiveSnooze,
  proactiveExecutingId,
  proactiveStreaming,
  showProactiveAutoExecute,
  onApprove,
  onReject,
  resolvingApprovalId,
}: OverviewUnifiedFeedProps) {
  return (
    <section data-testid="overview-unified-feed">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionLabel
          title={t('overview.section.activity')}
          subtitle={t('overview.section.activity.subtitle')}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="premium"
          title={filteredEmpty ? t('overview.empty.filtered') : t('overview.empty.activity')}
          actionLabel={filteredEmpty ? t('activity.empty.clearFilters') : undefined}
          onAction={filteredEmpty ? onClearFilters : undefined}
          className="py-10"
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <UnifiedRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onSelect={onSelect}
              highlightedId={highlightedId}
              onProactiveExecute={onProactiveExecute}
              onProactiveDismiss={onProactiveDismiss}
              onProactiveSnooze={onProactiveSnooze}
              proactiveExecutingId={proactiveExecutingId}
              proactiveStreaming={proactiveStreaming}
              showProactiveAutoExecute={showProactiveAutoExecute}
              onApprove={onApprove}
              onReject={onReject}
              resolvingApprovalId={resolvingApprovalId}
            />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={onLoadMore}
              >
                {t('overview.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}

      <ActivityDetailSheet
        item={selected}
        open={Boolean(selectedId && selected)}
        onClose={onCloseDetail}
      />
    </section>
  );
}
