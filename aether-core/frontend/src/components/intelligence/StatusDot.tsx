import { cn } from '@/lib/utils';

export type StatusDotVariant = 'active' | 'idle' | 'executing';

interface StatusDotProps {
  variant: StatusDotVariant;
  className?: string;
  label?: string;
}

const dotStyles: Record<StatusDotVariant, string> = {
  active: 'bg-success animate-pulse',
  idle: 'bg-muted-foreground/40',
  executing: 'bg-primary animate-pulse',
};

export default function StatusDot({ variant, className, label }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotStyles[variant])}
        aria-hidden
      />
      {label ? (
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-wide',
            variant === 'active'
              ? 'text-success'
              : variant === 'executing'
                ? 'text-primary'
                : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
