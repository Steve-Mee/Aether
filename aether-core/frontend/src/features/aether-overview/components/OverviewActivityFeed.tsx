import React from 'react';
import { Link } from 'react-router-dom';
import ActivityRowCard from '@/components/activity-page/ActivityRowCard';
import ActivityDetailSheet from '@/components/activity-page/ActivityDetailSheet';
import { Button, EmptyState } from '@/components/ui';
import { SectionLabel } from '@/components/command-center/primitives';
import { t } from '@/lib/i18n';
import type { ActivityDateGroup } from '@/lib/activityPresentation';
import type { ActivityItem } from '@/types/activity';

interface OverviewActivityFeedProps {
  groups: ActivityDateGroup[];
  selected: ActivityItem | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  canLoadMore: boolean;
  onLoadMore: () => void;
  filteredEmpty: boolean;
  onClearFilters?: () => void;
}

export default function OverviewActivityFeed({
  groups,
  selected,
  selectedId,
  onSelect,
  onCloseDetail,
  canLoadMore,
  onLoadMore,
  filteredEmpty,
  onClearFilters,
}: OverviewActivityFeedProps) {
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section data-testid="overview-activity-feed">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SectionLabel
          title={t('overview.section.activity')}
          subtitle={t('overview.section.activity.subtitle')}
        />
        <Link to="/timeline" className="text-sm font-medium text-primary hover:underline">
          {t('overview.section.activity.viewAll')}
        </Link>
      </div>

      {totalItems === 0 ? (
        <EmptyState
          variant="premium"
          title={filteredEmpty ? t('overview.empty.filtered') : t('overview.empty.activity')}
          actionLabel={filteredEmpty ? t('activity.empty.clearFilters') : undefined}
          onAction={filteredEmpty ? onClearFilters : undefined}
          className="py-10"
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <h3 className="text-xs font-medium uppercase tracking-widest text-caption-accessible mb-3">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <ActivityRowCard
                    key={item.id}
                    item={item}
                    onSelect={() => onSelect(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {canLoadMore && (
            <div className="flex justify-center pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onLoadMore}>
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
