import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Status and metadata tag. Use semantic variants for risk/state, feature variants for rollout status.
 *
 * @example
 * <Badge variant="riskHigh">High risk</Badge>
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/20 text-primary-readable',
        success: 'border-success/50 bg-success/35 text-emerald-200',
        warning: 'border-warning/50 bg-warning/35 text-amber-200',
        danger: 'border-danger/50 bg-danger/35 text-red-200',
        muted: 'border-transparent bg-muted text-muted-foreground',
        outline: 'border-border text-foreground',
        riskLow: 'border-success/50 bg-success/35 text-emerald-200',
        riskMedium: 'border-warning/50 bg-warning/35 text-amber-200',
        riskHigh: 'border-danger/50 bg-danger/35 text-red-200',
        live: 'border-success/50 bg-success/35 text-emerald-200 uppercase tracking-widest px-3 py-1',
        partial:
          'border-warning/50 bg-warning/35 text-amber-200 uppercase tracking-widest px-3 py-1',
        experimental:
          'border-primary/45 bg-primary/20 text-primary-readable uppercase tracking-widest px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} role="status" {...props} />;
}

export { Badge, badgeVariants };
