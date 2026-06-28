import React, { useMemo } from 'react';
import { SearchInput, StatChip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import {
  ACTIVITY_EXECUTION_MODE_OPTIONS,
  ACTIVITY_MODULE_OPTIONS,
} from '@/lib/activityFilterUtils';
import {
  CATEGORY_OPTIONS,
  EXECUTOR_FILTER_OPTIONS,
  RISK_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  buildAgentFilterOptions,
} from '@/lib/activityPresentation';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import type {
  ActivityCategory,
  ActivityAgentFilter,
  ActivityExecutionModeFilter,
  ActivityExecutorFilter,
  ActivityFilters,
  ActivityModuleFilter,
  ActivityRiskFilter,
  ActivityStatusFilter,
} from '@/types/activity';

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  agentKeys?: string[];
  onSearchChange: (q: string) => void;
  onCategoryChange: (c: ActivityCategory) => void;
  onRiskChange: (r: ActivityRiskFilter) => void;
  onExecutorChange: (e: ActivityExecutorFilter) => void;
  onStatusChange: (s: ActivityStatusFilter) => void;
  onAgentChange: (a: ActivityAgentFilter) => void;
  onModuleChange: (m: ActivityModuleFilter) => void;
  onExecutionModeChange: (m: ActivityExecutionModeFilter) => void;
}

function FilterPills<T extends string>({
  options,
  active,
  onChange,
  labelKey,
  testIdPrefix,
  groupLabel,
  getLabel,
}: {
  options: readonly T[];
  active: T;
  onChange: (v: T) => void;
  labelKey?: (v: T) => string;
  getLabel?: (v: T) => string;
  testIdPrefix: string;
  groupLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={groupLabel}>
      {options.map((opt) => {
        const isActive = active === opt;
        const label = getLabel ? getLabel(opt) : t(labelKey!(opt));
        return (
          <button
            key={opt}
            type="button"
            data-testid={`${testIdPrefix}-${opt}`}
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
              isActive
                ? 'bg-surface-elevated text-foreground'
                : 'text-muted-foreground hover:text-foreground border border-transparent',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function countActiveFilters(filters: ActivityFilters): number {
  let n = 0;
  if (filters.category !== 'all') n += 1;
  if (filters.risk !== 'all') n += 1;
  if (filters.executor !== 'all') n += 1;
  if (filters.status !== 'all') n += 1;
  if (filters.agentKey !== 'all') n += 1;
  if (filters.module !== 'all') n += 1;
  if (filters.executionMode !== 'all') n += 1;
  if (filters.searchQuery.trim()) n += 1;
  return n;
}

function executionModeLabel(mode: ActivityExecutionModeFilter): string {
  if (mode === 'all') return t('overview.filter.executionModeAll');
  if (mode === 'autonomous') return t('overview.filter.executionModeAutonomous');
  if (mode === 'approval_required') return t('overview.filter.executionModeApproval');
  return t('overview.filter.executionModeInform');
}

export default function ActivityFilterBar({
  filters,
  agentKeys,
  onSearchChange,
  onCategoryChange,
  onRiskChange,
  onExecutorChange,
  onStatusChange,
  onAgentChange,
  onModuleChange,
  onExecutionModeChange,
}: ActivityFilterBarProps) {
  const agentOptions = useMemo(() => buildAgentFilterOptions(agentKeys), [agentKeys]);
  const activeCount = countActiveFilters(filters);

  return (
    <div className="mb-6 space-y-4" data-testid="activity-filter-bar">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('activity.search.placeholder')}
          label={t('a11y.searchActivity')}
          data-testid="activity-search"
          wrapperClassName="max-w-md flex-1"
        />
        {activeCount > 0 && (
          <StatChip className="text-caption">
            {t('activity.filter.activeCount').replace('{count}', String(activeCount))}
          </StatChip>
        )}
      </div>

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
        <p className="text-caption text-muted-foreground">{t('activity.filter.agent')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('activity.filter.agent')}>
          {agentOptions.map((opt) => {
            const isActive = filters.agentKey === opt;
            return (
              <button
                key={opt}
                type="button"
                data-testid={`activity-agent-${opt}`}
                onClick={() => onAgentChange(opt)}
                aria-pressed={isActive}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                  isActive
                    ? 'bg-surface-elevated text-foreground'
                    : 'text-muted-foreground hover:text-foreground border border-transparent',
                )}
              >
                {opt === 'all' ? t('activity.category.all') : agentDisplayLabel(opt)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-8">
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">{t('overview.filter.module')}</p>
          <FilterPills
            options={ACTIVITY_MODULE_OPTIONS}
            active={filters.module}
            onChange={onModuleChange}
            getLabel={(m) => (m === 'all' ? t('overview.filter.moduleAll') : m)}
            testIdPrefix="activity-module"
            groupLabel={t('overview.filter.module')}
          />
        </div>
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">{t('overview.filter.executionMode')}</p>
          <FilterPills
            options={ACTIVITY_EXECUTION_MODE_OPTIONS}
            active={filters.executionMode}
            onChange={onExecutionModeChange}
            getLabel={executionModeLabel}
            testIdPrefix="activity-execution-mode"
            groupLabel={t('overview.filter.executionMode')}
          />
        </div>
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
