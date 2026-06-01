import { type ReactNode } from 'react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { IconBadge } from '@/components/command-center/primitives';
import { cn } from '@/lib/utils';

interface InsightCardBaseProps {
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  accent?: 'default' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const accentBar: Record<NonNullable<InsightCardBaseProps['accent']>, string> = {
  default: 'bg-primary/25',
  success: 'bg-emerald-500/20',
  warning: 'bg-amber-500/20',
  danger: 'bg-red-500/20',
};

export default function InsightCardBase({
  title,
  eyebrow,
  icon,
  accent = 'default',
  children,
  footer,
  className,
}: InsightCardBaseProps) {
  return (
    <Card
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-2xl border-border/25',
        'bg-card/55 backdrop-blur-sm insight-card-shadow',
        'transition-all duration-200 hover:border-border/40 hover:shadow-[var(--shadow-elevated)]',
        className
      )}
    >
      <div
        className={cn('absolute left-0 top-5 bottom-5 w-0.5 rounded-full', accentBar[accent])}
        aria-hidden
      />
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
        {icon && <IconBadge>{icon}</IconBadge>}
      </CardHeader>
      <CardContent className="relative flex-1 space-y-4 p-0 px-6 py-5 pl-5">{children}</CardContent>
      {footer && (
        <div className="relative mt-auto flex flex-wrap gap-2 border-t border-border/20 px-6 pb-6 pl-5 pt-4">
          {footer}
        </div>
      )}
    </Card>
  );
}
