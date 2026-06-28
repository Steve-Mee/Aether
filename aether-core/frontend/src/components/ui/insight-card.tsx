import { type ReactNode } from 'react';
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

type InsightAccent = 'default' | 'success' | 'warning' | 'danger';

export interface InsightCardProps {
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  accent?: InsightAccent;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  highlighted?: boolean;
  highlightPulse?: boolean;
  executed?: boolean;
}

/**
 * Proactive insight surface for Command Center and autonomy flows.
 * Use for AI-generated recommendations with optional footer actions.
 *
 * @example
 * <InsightCard title="Prijsoptimalisatie" accent="success" footer={<Button size="sm">Uitvoeren</Button>}>
 *   <p>3 producten klaar voor prijsupdate.</p>
 * </InsightCard>
 */
export function InsightCard({
  title,
  eyebrow,
  icon,
  accent = 'default',
  children,
  footer,
  className,
  highlighted,
  highlightPulse,
  executed,
}: InsightCardProps) {
  return (
    <Card
      variant="insight"
      accent={accent}
      highlighted={highlighted}
      highlightPulse={highlightPulse}
      className={cn('flex min-h-0 flex-col', className)}
    >
      <CardHeader className="relative flex-row items-start justify-between gap-4 space-y-0 p-0 px-6 pt-6 pb-0 pl-5">
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow && (
            <p className="text-[10px] font-medium tracking-widest text-muted-foreground/65">
              {eyebrow}
            </p>
          )}
          <CardTitle className="text-[16px] font-medium leading-snug text-foreground">
            {title}
          </CardTitle>
        </div>
        {icon && (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-muted/30 text-muted-foreground">
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="relative flex-1 space-y-4 p-0 px-6 py-5 pl-5">{children}</CardContent>
      {footer && (
        <div className="relative mt-auto flex flex-wrap items-center gap-2 border-t border-border/20 px-6 pb-6 pl-5 pt-4">
          {executed && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-success/20 bg-success/5 px-2.5 py-1 text-[11px] text-success animate-fade-in">
              <CheckCircle2 size={12} strokeWidth={2} />
              Uitgevoerd
            </span>
          )}
          {footer}
        </div>
      )}
    </Card>
  );
}

export default InsightCard;
