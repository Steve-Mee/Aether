import React from 'react';
import { SearchInput } from '@/components/ui';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import {
  CATEGORY_OPTIONS,
  EXECUTOR_FILTER_OPTIONS,
  RISK_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  AGENT_FILTER_OPTIONS,
} from '@/lib/activityPresentation';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import type {
  ActivityCategory,
  ActivityAgentFilter,
  ActivityExecutorFilter,
  ActivityFilters,
  ActivityRiskFilter,
  ActivityStatusFilter,
} from '@/types/activity';

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  onSearchChange: (q: string) => void;
  onCategoryChange: (c: ActivityCategory) => void;
  onRiskChange: (r: ActivityRiskFilter) => void;
  onExecutorChange: (e: ActivityExecutorFilter) => void;
  onStatusChange: (s: ActivityStatusFilter) => void;
  onAgentChange: (a: ActivityAgentFilter) => void;
}

function FilterPills<T extends string>({
  options,
  active,
  onChange,
  labelKey,
  testIdPrefix,
  groupLabel,
}: {
  options: readonly T[];
  active: T;
  onChange: (v: T) => void;
  labelKey: (v: T) => string;
  testIdPrefix: string;
  groupLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={groupLabel}>
      {options.map((opt) => {
        const isActive = active === opt;
        return (
          <button
            key={opt}
            type="button"
            data-testid={`${testIdPrefix}-${opt}`}
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
              isActive
                ? 'bg-surface-elevated text-foreground'
                : 'text-muted-foreground hover:text-foreground border border-transparent',
            )}
          >
            {t(labelKey(opt))}
          </button>
        );
      })}
    </div>
  );
}

export default function ActivityFilterBar({
  filters,
  onSearchChange,
  onCategoryChange,
  onRiskChange,
  onExecutorChange,
  onStatusChange,
  onAgentChange,
}: ActivityFilterBarProps) {
  return (
    <div className="mb-6 space-y-4" data-testid="activity-filter-bar">
      <SearchInput
        value={filters.searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('activity.search.placeholder')}
        label={t('a11y.searchActivity')}
        data-testid="activity-search"
        wrapperClassName="max-w-md"
      />

      <div className="space-y-2">
        <p className="text-caption text-muted-foreground" id="activity-filter-type-label">
          {t('activity.filter.type')}
        </p>
        <FilterPills
          options={CATEGORY_OPTIONS}
          active={filters.category}
          onChange={onCategoryChange}
          labelKey={(v) => `activity.category.${v}`}
          testIdPrefix="activity-category"
          groupLabel={t('activity.filter.type')}
        />
      </div>

      <div className="space-y-2">
        <p className="text-caption text-muted-foreground">Agent</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Agent filter">
          {AGENT_FILTER_OPTIONS.map((opt) => {
            const isActive = filters.agentKey === opt;
            return (
              <button
                key={opt}
                type="button"
                data-testid={`activity-agent-${opt}`}
                onClick={() => onAgentChange(opt)}
                aria-pressed={isActive}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                  isActive
                    ? 'bg-surface-elevated text-foreground'
                    : 'text-muted-foreground hover:text-foreground border border-transparent',
                )}
              >
                {opt === 'all' ? 'Alle' : agentDisplayLabel(opt)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">{t('activity.filter.risk')}</p>
          <FilterPills
            options={RISK_FILTER_OPTIONS}
            active={filters.risk}
            onChange={onRiskChange}
            labelKey={(v) => `activity.riskFilter.${v}`}
            testIdPrefix="activity-risk"
            groupLabel={t('activity.filter.risk')}
          />
        </div>
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">{t('activity.filter.executor')}</p>
          <FilterPills
            options={EXECUTOR_FILTER_OPTIONS}
            active={filters.executor}
            onChange={onExecutorChange}
            labelKey={(v) => `activity.executor.${v}`}
            testIdPrefix="activity-executor"
            groupLabel={t('a11y.activity.executorFilter')}
          />
        </div>
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">{t('activity.filter.status')}</p>
          <FilterPills
            options={STATUS_FILTER_OPTIONS}
            active={filters.status}
            onChange={onStatusChange}
            labelKey={(v) => `activity.statusFilter.${v}`}
            testIdPrefix="activity-status"
            groupLabel={t('a11y.activity.statusFilter')}
          />
        </div>
      </div>
    </div>
  );
}
