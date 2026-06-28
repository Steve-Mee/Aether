import React from 'react';
import { SearchInput } from '@/components/ui';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import type { AgentRosterEntry } from '@/types/agents';
import type {
  OverviewActionType,
  OverviewExecutionModeFilter,
  OverviewFilters,
  OverviewPeriod,
  OverviewRiskFilter,
} from '../types';

interface OverviewFilterBarProps {
  filters: OverviewFilters;
  agents: AgentRosterEntry[];
  onSearchChange: (q: string) => void;
  onAgentChange: (agentKey: string) => void;
  onActionTypeChange: (type: OverviewActionType) => void;
  onPeriodChange: (period: OverviewPeriod) => void;
  onRiskChange: (risk: OverviewRiskFilter) => void;
  onModuleChange: (module: string) => void;
  onExecutionModeChange: (mode: OverviewExecutionModeFilter) => void;
  onClearFilters?: () => void;
}

const ACTION_TYPES: OverviewActionType[] = [
  'all',
  'proactive',
  'autonomous',
  'goal',
  'approval',
];
const PERIODS: OverviewPeriod[] = ['24h', '7d', '30d'];
const RISKS: OverviewRiskFilter[] = ['all', 'low', 'high'];
const MODULES = ['all', 'admin-command-bar', 'aether-mail', 'payment-fulfillment'];
const EXEC_MODES: OverviewExecutionModeFilter[] = [
  'all',
  'autonomous',
  'approval_required',
  'inform_only',
];

function actionTypeLabel(type: OverviewActionType): string {
  switch (type) {
    case 'all':
      return t('overview.filter.typeAll');
    case 'proactive':
      return t('overview.filter.typeProactive');
    case 'autonomous':
      return t('overview.filter.typeAutonomous');
    case 'goal':
      return t('overview.filter.typeGoal');
    case 'approval':
      return t('overview.filter.typeApproval');
    default:
      return type;
  }
}

function periodLabel(period: OverviewPeriod): string {
  switch (period) {
    case '24h':
      return t('overview.filter.period24h');
    case '7d':
      return t('overview.filter.period7d');
    case '30d':
      return t('overview.filter.period30d');
    default:
      return period;
  }
}

function PillGroup<T extends string>({
  label,
  options,
  active,
  onChange,
  getLabel,
  testIdPrefix,
}: {
  label: string;
  options: readonly T[];
  active: T;
  onChange: (v: T) => void;
  getLabel: (v: T) => string;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-caption-accessible">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
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
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-surface-elevated text-foreground border border-border/40'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {getLabel(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function OverviewFilterBar({
  filters,
  agents,
  onSearchChange,
  onAgentChange,
  onActionTypeChange,
  onPeriodChange,
  onRiskChange,
  onModuleChange,
  onExecutionModeChange,
}: OverviewFilterBarProps) {
  const agentOptions = ['all', ...agents.map((a) => a.agentKey)];

  return (
    <div
      className="mb-6 space-y-4 rounded-xl border border-border/30 bg-card/30 p-4"
      data-testid="overview-filter-bar"
    >
      <SearchInput
        value={filters.searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('overview.filter.search')}
        aria-label={t('overview.filter.search')}
        className="max-w-md"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PillGroup
          label={t('overview.filter.agent')}
          options={agentOptions}
          active={filters.agentKey}
          onChange={onAgentChange}
          getLabel={(key) =>
            key === 'all' ? t('overview.filter.agentAll') : agentDisplayLabel(key)
          }
          testIdPrefix="overview-filter-agent"
        />
        <PillGroup
          label={t('overview.filter.type')}
          options={ACTION_TYPES}
          active={filters.actionType}
          onChange={onActionTypeChange}
          getLabel={actionTypeLabel}
          testIdPrefix="overview-filter-type"
        />
        <PillGroup
          label={t('overview.filter.period')}
          options={PERIODS}
          active={filters.period}
          onChange={onPeriodChange}
          getLabel={periodLabel}
          testIdPrefix="overview-filter-period"
        />
        <PillGroup
          label={t('overview.filter.risk')}
          options={RISKS}
          active={filters.risk}
          onChange={onRiskChange}
          getLabel={(r) =>
            r === 'all' ? t('overview.filter.riskAll') : r === 'high' ? t('activity.filter.riskHigh') : t('activity.filter.riskLow')
          }
          testIdPrefix="overview-filter-risk"
        />
        <PillGroup
          label={t('overview.filter.module')}
          options={MODULES}
          active={filters.module}
          onChange={onModuleChange}
          getLabel={(m) => (m === 'all' ? t('overview.filter.moduleAll') : m)}
          testIdPrefix="overview-filter-module"
        />
        <PillGroup
          label={t('overview.filter.executionMode')}
          options={EXEC_MODES}
          active={filters.executionMode}
          onChange={onExecutionModeChange}
          getLabel={(m) => {
            if (m === 'all') return t('overview.filter.executionModeAll');
            if (m === 'autonomous') return t('overview.filter.typeAutonomous');
            if (m === 'approval_required') return t('overview.filter.executionApproval');
            return t('overview.filter.executionInform');
          }}
          testIdPrefix="overview-filter-execution"
        />
      </div>
    </div>
  );
}
