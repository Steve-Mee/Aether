import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Surface container for content blocks. Use compound subcomponents for structure.
 * `elevated` for panels, `glass` for sidecars, `insight` for proactive AI cards.
 *
 * @example
 * <Card variant="elevated" padding="md">
 *   <CardHeader><CardTitle>Orders</CardTitle></CardHeader>
 *   <CardContent>...</CardContent>
 * </Card>
 */
const cardVariants = cva('rounded-xl border text-card-foreground transition-all', {
  variants: {
    variant: {
      default: 'border-border bg-card shadow-sm',
      elevated: 'border-border/40 bg-card shadow-elevated',
      glass: 'border-border/25 panel-surface backdrop-blur-md',
      insight:
        'relative overflow-hidden rounded-2xl border-border/25 bg-card/55 backdrop-blur-sm insight-card-shadow hover:border-border/40 hover:shadow-elevated',
    },
    accent: {
      none: '',
      default: '',
      success: '',
      warning: '',
      danger: '',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    accent: 'none',
    padding: 'md',
  },
});

const accentBarStyles = {
  default: 'bg-primary/25',
  success: 'bg-success/20',
  warning: 'bg-warning/20',
  danger: 'bg-danger/20',
} as const;

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  highlighted?: boolean;
  highlightPulse?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      accent = 'none',
      padding,
      highlighted,
      highlightPulse,
      children,
      ...props
    },
    ref,
  ) => {
    const showAccentBar = variant === 'insight' && accent && accent !== 'none';
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, accent, padding }),
          highlighted &&
            'ring-2 ring-primary/30 shadow-glow-focus border-primary/25 animate-fade-in',
          highlightPulse && 'ring-2 ring-transparent animate-highlight-pulse',
          className,
        )}
        {...props}
      >
        {showAccentBar && (
          <div
            className={cn(
              'absolute left-0 top-5 bottom-5 w-0.5 rounded-full',
              accentBarStyles[accent as keyof typeof accentBarStyles],
            )}
            aria-hidden
          />
        )}
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-4', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
