import React, { useMemo } from 'react';
import { SegmentedControl, SearchInput } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { ApprovalDateFilter, ApprovalTab } from '@/types/approval';

const TABS: ApprovalTab[] = ['all', 'high', 'low', 'recent'];
const DATE_FILTERS: ApprovalDateFilter[] = ['all', 'today', 'week'];

const tabKeys: Record<ApprovalTab, string> = {
  all: 'approvals.tab.all',
  high: 'approvals.tab.high',
  low: 'approvals.tab.low',
  recent: 'approvals.tab.recent',
};

const dateKeys: Record<ApprovalDateFilter, string> = {
  all: 'approvals.date.all',
  today: 'approvals.date.today',
  week: 'approvals.date.week',
};

interface ApprovalToolbarProps {
  activeTab: ApprovalTab;
  onTabChange: (tab: ApprovalTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  dateFilter: ApprovalDateFilter;
  onDateFilterChange: (f: ApprovalDateFilter) => void;
}

export default function ApprovalToolbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
}: ApprovalToolbarProps) {
  const tabOptions = useMemo(() => TABS.map((tab) => ({ value: tab, label: t(tabKeys[tab]) })), []);

  const dateOptions = useMemo(
    () => DATE_FILTERS.map((f) => ({ value: f, label: t(dateKeys[f]) })),
    [],
  );

  return (
    <div className="mb-6 space-y-4" data-testid="approvals-toolbar">
      <SegmentedControl
        options={tabOptions}
        value={activeTab}
        onChange={onTabChange}
        data-testid="approvals-tabs"
        aria-label={t('a11y.approvals.statusFilter')}
      />

      {activeTab !== 'recent' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('approvals.search.placeholder')}
            label={t('a11y.searchApprovals')}
            data-testid="approvals-search"
            wrapperClassName="max-w-md"
          />
          <SegmentedControl
            options={dateOptions}
            value={dateFilter}
            onChange={onDateFilterChange}
            data-testid="approvals-date"
            aria-label={t('a11y.approvals.dateFilter')}
            className="text-xs [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs"
          />
        </div>
      )}
    </div>
  );
}
