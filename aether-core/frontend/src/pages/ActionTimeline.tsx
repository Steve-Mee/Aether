import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import ActivityPageHeader from '@/components/activity-page/ActivityPageHeader';
import ActivityPeriodToolbar from '@/components/activity-page/ActivityPeriodToolbar';
import ActivityFilterBar from '@/components/activity-page/ActivityFilterBar';
import ActivityList from '@/components/activity-page/ActivityList';
import ActivityDetailSheet from '@/components/activity-page/ActivityDetailSheet';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { useActivityPage } from '@/hooks/useActivityPage';
import { ActivityPageSkeleton, AsyncBoundary, EmptyState } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { ActivityFilters } from '@/types/activity';

function hasActiveFilters(filters: ActivityFilters): boolean {
  return (
    filters.category !== 'all' ||
    filters.risk !== 'all' ||
    filters.executor !== 'all' ||
    filters.status !== 'all' ||
    filters.agentKey !== 'all' ||
    filters.searchQuery.trim().length > 0
  );
}

export default function ActionTimeline() {
  const page = useActivityPage();
  const filteredEmpty = useMemo(
    () => page.filtered.length === 0 && hasActiveFilters(page.filters),
    [page.filtered.length, page.filters],
  );

  return (
    <ModulePageLayout
      testId="activity-page"
      maxWidth="4xl"
      header={
        <ActivityPageHeader
          autonomousCount={page.stats.autonomous}
          approvedCount={page.stats.approved}
          feedSource={page.merged.source}
        />
      }
      loading={false}
      error={null}
      wrapAsync={false}
    >
      <ActivityPeriodToolbar
        period={page.period}
        onPeriodChange={page.setPeriod}
        customRange={page.customRange}
        onCustomRangeChange={page.setCustomRange}
      />

      <ActivityFilterBar
        filters={page.filters}
        onSearchChange={(q) => page.updateFilter('searchQuery', q)}
        onCategoryChange={(c) => page.updateFilter('category', c)}
        onRiskChange={(r) => page.updateFilter('risk', r)}
        onExecutorChange={(e) => page.updateFilter('executor', e)}
        onStatusChange={(s) => page.updateFilter('status', s)}
        onAgentChange={(a) => page.updateFilter('agentKey', a)}
      />

      <AsyncBoundary
        loading={page.loading}
        error={page.error}
        onRetry={page.reload}
        skeleton={<ActivityPageSkeleton />}
      >
        {page.filtered.length === 0 ? (
          <div data-testid="activity-list">
            <EmptyState
              variant="premium"
              title={filteredEmpty ? t('activity.empty.filtered.title') : t('activity.empty.title')}
              description={
                filteredEmpty
                  ? t('activity.empty.filtered.description')
                  : t('activity.empty.description')
              }
              actionLabel={filteredEmpty ? t('activity.empty.clearFilters') : undefined}
              onAction={filteredEmpty ? page.clearFilters : undefined}
              icon={<History size={32} />}
            />
          </div>
        ) : (
          <ActivityList groups={page.groups} onSelect={(id) => page.setSelectedId(id)} />
        )}
      </AsyncBoundary>

      <ActivityDetailSheet
        item={page.selected}
        open={page.selectedId != null}
        onClose={() => page.setSelectedId(null)}
      />
    </ModulePageLayout>
  );
}
