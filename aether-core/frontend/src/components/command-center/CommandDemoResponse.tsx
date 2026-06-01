import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import type { DemoCommandResponse } from '@/lib/localIntentMatcher';
import { cn } from '@/lib/utils';

interface CommandDemoResponseProps {
  response: DemoCommandResponse;
  loading?: boolean;
}

const actionRoutes: Record<string, string> = {
  APPLY_PRICE: '/products',
  SYNC_SUPPLIER: '/suppliers',
  OPEN_APPROVALS: '/approvals',
  SHOW_INSIGHTS: '/insights',
};

export default function CommandDemoResponse({ response, loading }: CommandDemoResponseProps) {
  if (loading) {
    return (
      <Card
        className="mt-3 rounded-2xl border-border/25 bg-card/50 insight-card-shadow animate-pulse"
        data-testid="command-demo-loading"
      >
        <CardContent className="p-6 space-y-4">
          <div className="h-4 w-32 rounded bg-muted/40" />
          <div className="h-8 w-24 rounded bg-muted/30" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted/25" />
            <div className="h-3 w-4/5 rounded bg-muted/25" />
          </div>
          <p className="text-sm text-muted-foreground/70">AETHER analyseert je commando…</p>
        </CardContent>
      </Card>
    );
  }

  const route = response.action ? actionRoutes[response.action] : null;
  const showMetric = response.metricLabel && response.metricValue;

  return (
    <Card
      className={cn(
        'mt-3 rounded-2xl border-border/25 bg-card/55 insight-card-shadow',
        'animate-fade-in'
      )}
      data-testid="command-demo-response"
      role="status"
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/65 flex items-center gap-1.5">
              <Sparkles size={12} />
              AETHER
            </p>
            <p className="text-sm font-medium text-foreground leading-snug">{response.result}</p>
            <p className="text-sm text-muted-foreground/80 leading-relaxed">{response.summary}</p>
          </div>
          {showMetric && (
            <div className="shrink-0 text-right space-y-1">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {response.metricValue}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/65">
                {response.metricLabel}
              </p>
            </div>
          )}
        </div>

        {response.highlights.length > 0 && (
          <ul className="space-y-1.5 border-t border-border/20 pt-3">
            {response.highlights.map((line) => (
              <li key={line} className="text-xs text-muted-foreground/85 leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {route && (
            <Button size="sm" className="h-9 rounded-lg" asChild>
              <Link to={route}>
                {response.intentId === 'HIGH_RISK_APPROVALS' ? 'Open goedkeuringen' : 'Bekijk details'}
              </Link>
            </Button>
          )}
          <Button size="sm" variant="premium" className="h-9 rounded-lg">
            Uitleg
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
