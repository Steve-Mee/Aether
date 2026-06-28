import React from 'react';
import ActivityRowCard from '@/components/activity-page/ActivityRowCard';
import ActivityDetailSheet from '@/components/activity-page/ActivityDetailSheet';
import { Button, Card, CardContent, EmptyState } from '@/components/ui';
import { SectionLabel } from '@/components/command-center/primitives';
import { t } from '@/lib/i18n';
import type { OverviewFeedItem } from '../types/overviewFeed';
import { activityFromOverviewItem } from '../types/overviewFeed';
import type { ActivityItem } from '@/types/activity';

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
}

function UnifiedRow({
  item,
  onSelect,
  highlightedId,
}: {
  item: OverviewFeedItem;
  onSelect: (id: string) => void;
  highlightedId?: string | null;
}) {
  if (item.kind === 'activity') {
    const activity = activityFromOverviewItem(item);
    if (!activity) return null;
    return (
      <div data-highlighted={highlightedId === item.id ? 'true' : undefined}>
        <ActivityRowCard item={activity} onSelect={() => onSelect(item.id)} />
      </div>
    );
  }

  return (
    <Card
      data-testid={`overview-feed-${item.kind}-${item.id}`}
      data-highlighted={highlightedId === item.id ? 'true' : undefined}
      className="rounded-xl border-border/25 bg-card/40 data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-primary/40"
    >
      <CardContent className="p-3.5">
        <p className="text-[10px] uppercase tracking-widest text-caption-accessible mb-1">
          {item.kind}
        </p>
        <p className="text-sm font-medium">
          {String(item.payload.label ?? item.payload.title ?? item.payload.description ?? item.id)}
        </p>
      </CardContent>
    </Card>
  );
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
}: OverviewUnifiedFeedProps) {
  const activityItems = items.filter((i) => i.kind === 'activity');

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
