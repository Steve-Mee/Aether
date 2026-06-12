import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export function TimeInput({ className, ...props }: TimeInputProps) {
  return (
    <input
      type="time"
      {...props}
      className={cn(
        'bg-background border border-border/40 rounded-lg px-3 py-2 text-foreground text-sm',
        'focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none',
        className,
      )}
    />
  );
}
