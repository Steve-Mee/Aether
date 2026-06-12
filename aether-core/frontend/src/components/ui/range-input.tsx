import * as React from 'react';
import { cn } from '@/lib/utils';

export interface RangeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  valueLabel?: string;
}

export function RangeInput({
  className,
  valueLabel,
  min,
  max,
  value,
  id,
  ...props
}: RangeInputProps) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  return (
    <div className={cn('w-full min-w-[200px] space-y-2', className)}>
      {valueLabel && (
        <div className="text-body font-medium text-foreground tabular-nums">{valueLabel}</div>
      )}
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        value={value}
        aria-valuemin={min != null ? Number(min) : undefined}
        aria-valuemax={max != null ? Number(max) : undefined}
        aria-valuenow={Number.isFinite(numericValue) ? numericValue : undefined}
        aria-valuetext={valueLabel}
        {...props}
        className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer focus-visible:shadow-[var(--shadow-focus)]"
      />
    </div>
  );
}
