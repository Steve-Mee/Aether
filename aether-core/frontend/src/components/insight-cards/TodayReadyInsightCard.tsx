import { Link } from 'react-router-dom';
import {
  BarChart3,
  Package,
  PieChart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui';
import {
  ConfidenceHero,
  MetricBlock,
  StatChip,
  AutonomyModeBadge,
} from '@/components/command-center/primitives';
import type { ActionExecutionMode } from '@/lib/actionAutonomy';
import { cn, interactiveSurface } from '@/lib/utils';
import type { TodayReadyInsight, TodayReadyInsightId } from '@/lib/todayReady';
import InsightCardBase from './InsightCardBase';

interface TodayReadyInsightCardProps {
  insight: TodayReadyInsight;
  executionMode?: ActionExecutionMode;
  highlighted?: boolean;
  highlightPulse?: boolean;
  recentlyUpdated?: boolean;
  onActivate?: (insightId: TodayReadyInsightId) => void;
  onExecute?: (insightId: TodayReadyInsightId) => void;
}

const variantIcons: Record<TodayReadyInsight['variant'], React.ReactNode> = {
  pricing: <TrendingUp size={16} strokeWidth={1.75} />,
  supplier: <Truck size={16} strokeWidth={1.75} />,
  approvals: <ShieldAlert size={16} strokeWidth={1.75} />,
  margins: <PieChart size={16} strokeWidth={1.75} />,
  autonomous: <Zap size={16} strokeWidth={1.75} />,
  summary: <BarChart3 size={16} strokeWidth={1.75} />,
  returns: <Package size={16} strokeWidth={1.75} />,
};

function CardFooter({
  insight,
  executionMode = 'autonomous',
  onActivate,
  onExecute,
}: {
  insight: TodayReadyInsight;
  executionMode?: ActionExecutionMode;
  onActivate?: (insightId: TodayReadyInsightId) => void;
  onExecute?: (insightId: TodayReadyInsightId) => void;
}) {
  const run = () => onExecute?.(insight.id);
  const explain = () => onActivate?.(insight.id);
  const primaryLabel =
    executionMode === 'approval_required'
      ? 'Goedkeuring nodig'
      : executionMode === 'inform_only'
        ? 'Bekijken'
        : 'Automatisch uitvoeren';

  switch (insight.variant) {
    case 'pricing':
      return (
        <>
          <Button size="sm" className="h-9 flex-1 sm:flex-none rounded-lg" onClick={run}>
            {primaryLabel}
          </Button>
          <Button
            size="sm"
            variant="premium"
            className="h-9 flex-1 sm:flex-none rounded-lg"
            onClick={explain}
          >
            Uitleg
          </Button>
        </>
      );
    case 'supplier':
      return (
        <>
          <Button
            size="sm"
            variant="primary"
            className="h-9 gap-1.5 flex-1 sm:flex-none rounded-lg"
            onClick={run}
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            {executionMode === 'autonomous' ? 'Automatisch syncen' : primaryLabel}
          </Button>
          <Button
            size="sm"
            variant="premium"
            className="h-9 flex-1 sm:flex-none rounded-lg"
            onClick={explain}
          >
            SKUs
          </Button>
        </>
      );
    case 'approvals':
      return (
        <>
          <Button size="sm" className="h-9 flex-1 sm:flex-none rounded-lg" onClick={explain}>
            Goedkeuring nodig
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 flex-1 sm:flex-none rounded-lg text-muted-foreground"
            asChild
          >
            <Link to="/approvals">Wachtrij</Link>
          </Button>
        </>
      );
    case 'margins':
      return (
        <Button
          size="sm"
          variant="premium"
          className="h-9 flex-1 sm:flex-none rounded-lg"
          onClick={run}
        >
          Open Insights
        </Button>
      );
    case 'autonomous':
      return (
        <>
          <Button size="sm" className="h-9 gap-1.5 flex-1 sm:flex-none rounded-lg" onClick={run}>
            <Zap size={14} strokeWidth={1.75} />
            {primaryLabel}
          </Button>
          <Button
            size="sm"
            variant="premium"
            className="h-9 flex-1 sm:flex-none rounded-lg"
            onClick={explain}
          >
            Uitleg
          </Button>
        </>
      );
    case 'returns':
      return (
        <Button
          size="sm"
          variant="premium"
          className="h-9 w-full sm:w-auto rounded-lg"
          onClick={run}
        >
          Bekijk orders
        </Button>
      );
    case 'summary':
      return (
        <Button size="sm" variant="premium" className="h-9 w-full sm:w-auto rounded-lg" asChild>
          <Link to="/insights">Bekijk weekoverzicht</Link>
        </Button>
      );
  }
}

function CardBody({ insight }: { insight: TodayReadyInsight }) {
  if (
    (insight.variant === 'approvals' ||
      insight.variant === 'margins' ||
      insight.variant === 'returns') &&
    insight.listItems
  ) {
    return (
      <div className="space-y-4">
        {insight.confidence && (
          <ConfidenceHero value={insight.confidence.value} label={insight.confidence.label} />
        )}
        <ul className="space-y-2 border-t border-border/20 pt-3">
          {insight.listItems.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-2 text-sm text-muted-foreground"
            >
              <span className="truncate">{item.label}</span>
              <span
                className={cn(
                  'shrink-0 text-[10px] font-medium uppercase tracking-wide',
                  item.risk === 'Kritiek' ? 'text-destructive/90' : 'text-muted-foreground',
                )}
              >
                {item.risk}
              </span>
            </li>
          ))}
          {insight.listOverflow && (
            <li className="text-[11px] text-caption-accessible">{insight.listOverflow}</li>
          )}
        </ul>
      </div>
    );
  }

  if (insight.chips) {
    return (
      <div className="flex flex-wrap gap-2.5 pt-0.5">
        {insight.chips.map((chip) => (
          <StatChip key={chip}>{chip}</StatChip>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insight.confidence && (
        <ConfidenceHero value={insight.confidence.value} label={insight.confidence.label} />
      )}
      {insight.metric && (
        <MetricBlock
          label={insight.metric.label}
          value={insight.metric.value}
          subValue={insight.metric.subValue}
          size="lg"
        />
      )}
    </div>
  );
}

export default function TodayReadyInsightCard({
  insight,
  executionMode,
  highlighted,
  highlightPulse,
  recentlyUpdated,
  onActivate,
  onExecute,
}: TodayReadyInsightCardProps) {
  return (
    <InsightCardBase
      eyebrow={insight.eyebrow}
      title={insight.title}
      icon={variantIcons[insight.variant]}
      accent={insight.accent}
      highlighted={highlighted}
      highlightPulse={highlightPulse || recentlyUpdated}
      executed={insight.executed}
      footer={
        <CardFooter
          insight={insight}
          executionMode={executionMode}
          onActivate={onActivate}
          onExecute={onExecute}
        />
      }
      className={cn(
        insight.justAppeared && 'animate-card-enter',
        insight.exiting && 'animate-card-exit pointer-events-none',
        onActivate &&
          !insight.exiting &&
          !insight.executed &&
          interactiveSurface('cursor-pointer hover:border-border/40'),
      )}
    >
      <button
        type="button"
        className={cn('w-full text-left', onActivate && 'cursor-pointer focus:outline-none')}
        onClick={() => onActivate?.(insight.id)}
        disabled={!onActivate || insight.exiting}
        aria-label={`Open inzicht: ${insight.title}`}
      >
        {executionMode && insight.variant !== 'approvals' && (
          <div className="mb-3">
            <AutonomyModeBadge mode={executionMode} />
          </div>
        )}
        <CardBody insight={insight} />
      </button>
    </InsightCardBase>
  );
}
