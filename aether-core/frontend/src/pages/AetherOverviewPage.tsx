import React from 'react';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { AsyncBoundary } from '@/components/ui';
import OverviewHeader from '@/features/aether-overview/components/OverviewHeader';
import OverviewFilterBar from '@/features/aether-overview/components/OverviewFilterBar';
import OverviewAttentionSection from '@/features/aether-overview/components/OverviewAttentionSection';
import OverviewProactiveSection from '@/features/aether-overview/components/OverviewProactiveSection';
import OverviewGoalsSection from '@/features/aether-overview/components/OverviewGoalsSection';
import OverviewActivityFeed from '@/features/aether-overview/components/OverviewActivityFeed';
import OverviewUnifiedFeed from '@/features/aether-overview/components/OverviewUnifiedFeed';
import OverviewAgentMetricsSection from '@/features/aether-overview/components/OverviewAgentMetricsSection';
import OverviewHandoffsSection from '@/features/aether-overview/components/OverviewHandoffsSection';
import OverviewPageSkeleton from '@/features/aether-overview/components/OverviewPageSkeleton';
import { useAetherOverviewPage } from '@/features/aether-overview/hooks/useAetherOverviewPage';
import { DEFAULT_OVERVIEW_FILTERS, type OverviewSectionKey } from '@/features/aether-overview/types';
import { showAttentionSection } from '@/features/aether-overview/lib/overviewFilters';

function hasActiveFilters(
  filters: ReturnType<typeof useAetherOverviewPage>['filters'],
): boolean {
  return (
    filters.agentKey !== DEFAULT_OVERVIEW_FILTERS.agentKey ||
    filters.actionType !== DEFAULT_OVERVIEW_FILTERS.actionType ||
    filters.period !== DEFAULT_OVERVIEW_FILTERS.period ||
    filters.searchQuery.trim().length > 0 ||
    filters.risk !== DEFAULT_OVERVIEW_FILTERS.risk ||
    filters.module !== DEFAULT_OVERVIEW_FILTERS.module ||
    filters.executionMode !== DEFAULT_OVERVIEW_FILTERS.executionMode
  );
}

export default function AetherOverviewPage() {
  const page = useAetherOverviewPage();
  const filteredEmpty = hasActiveFilters(page.filters) && page.filteredActivityCount === 0;

  const renderSection = (key: OverviewSectionKey): React.ReactNode => {
    if (!page.isSectionVisible(key) || page.isSectionCollapsed(key)) return null;

    switch (key) {
      case 'attention':
        if (!page.showAttention || !showAttentionSection(page.filters)) return null;
        return (
          <OverviewAttentionSection
            key={key}
            items={page.pendingApprovals}
            onApprove={page.approve}
            onReject={page.reject}
            resolvingId={page.resolvingApprovalId}
            highlightedId={
              page.highlight?.kind === 'approval' ? page.highlightId : null
            }
          />
        );
      case 'agentMetrics':
        return (
          <OverviewAgentMetricsSection
            key={key}
            agents={page.agentMetrics}
            highlightedId={page.highlightId}
          />
        );
      case 'handoffs':
        return <OverviewHandoffsSection key={key} items={page.handoffs} />;
      case 'proactive':
        if (!page.showProactiveSection) return null;
        return (
          <OverviewProactiveSection
            key={key}
            items={page.proactive.items}
            onExecute={page.proactive.execute}
            onDismiss={page.proactive.dismiss}
            onSnooze={page.proactive.snooze}
            executingId={page.proactive.executingId}
            streaming={page.proactive.streaming}
            highlightedId={
              page.highlight?.kind === 'proactive' ? page.highlightId : null
            }
          />
        );
      case 'goals':
        if (!page.showGoalsSection) return null;
        return <OverviewGoalsSection key={key} goals={page.goals} />;
      case 'activity':
        if (!page.showActivityFeed) return null;
        return page.showUnifiedFeed ? (
          <OverviewUnifiedFeed
            key={key}
            items={page.unifiedItems}
            selected={page.selectedActivity}
            selectedId={page.selectedActivityId}
            onSelect={page.setSelectedActivityId}
            onCloseDetail={() => page.setSelectedActivityId(null)}
            hasNextPage={page.canLoadMore}
            isFetchingNextPage={page.isFetchingNextPage}
            onLoadMore={page.loadMore}
            filteredEmpty={filteredEmpty}
            onClearFilters={page.clearFilters}
            highlightedId={
              page.highlight?.kind === 'activity' ? page.highlightId : null
            }
            onProactiveExecute={page.proactive.execute}
            onProactiveDismiss={page.proactive.dismiss}
            onProactiveSnooze={page.proactive.snooze}
            proactiveExecutingId={page.proactive.executingId}
            proactiveStreaming={page.proactive.streaming}
            showProactiveAutoExecute={page.proactiveAllowAutoExecute}
            onApprove={page.approve}
            onReject={page.reject}
            resolvingApprovalId={page.resolvingApprovalId}
          />
        ) : (
          <OverviewActivityFeed
            key={key}
            groups={page.activityGroups}
            selected={page.selectedActivity}
            selectedId={page.selectedActivityId}
            onSelect={page.setSelectedActivityId}
            onCloseDetail={() => page.setSelectedActivityId(null)}
            canLoadMore={page.canLoadMore}
            onLoadMore={page.loadMore}
            filteredEmpty={filteredEmpty}
            onClearFilters={page.clearFilters}
          />
        );
      default:
        return null;
    }
  };

  const sectionBlocks: React.ReactNode[] = [];
  let gridBuffer: OverviewSectionKey[] = [];

  const flushGrid = () => {
    if (gridBuffer.length === 0) return;
    const nodes = gridBuffer.map((k) => renderSection(k)).filter(Boolean);
    if (nodes.length > 0) {
      sectionBlocks.push(
        <div key={`grid-${gridBuffer.join('-')}`} className="mb-8 grid gap-6 lg:grid-cols-2">
          {nodes}
        </div>,
      );
    }
    gridBuffer = [];
  };

  for (const key of page.sectionOrder) {
    if (key === 'proactive' || key === 'goals') {
      gridBuffer.push(key);
    } else {
      flushGrid();
      const node = renderSection(key);
      if (node) sectionBlocks.push(<div key={key}>{node}</div>);
    }
  }
  flushGrid();

  return (
    <ModulePageLayout
      testId="aether-overview-page"
      maxWidth="6xl"
      header={<OverviewHeader kpis={page.kpis} />}
      loading={false}
      error={null}
      wrapAsync={false}
    >
      <OverviewFilterBar
        filters={page.filters}
        agents={page.agents}
        onSearchChange={(q) => page.updateFilter('searchQuery', q)}
        onAgentChange={(a) => page.updateFilter('agentKey', a)}
        onActionTypeChange={(t) => page.updateFilter('actionType', t)}
        onPeriodChange={(p) => page.updateFilter('period', p)}
        onRiskChange={(r) => page.updateFilter('risk', r)}
        onModuleChange={(m) => page.updateFilter('module', m)}
        onExecutionModeChange={(m) => page.updateFilter('executionMode', m)}
        onClearFilters={page.clearFilters}
      />

      <AsyncBoundary
        loading={page.loading}
        error={page.error}
        onRetry={page.reload}
        skeleton={<OverviewPageSkeleton />}
      >
        {sectionBlocks}
      </AsyncBoundary>
    </ModulePageLayout>
  );
}
