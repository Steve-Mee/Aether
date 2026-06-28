import { forwardRef, type InputHTMLAttributes } from 'react';
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Compact NL command input for the global layout bar (non–Command Center).
 * For the hero command experience, use `CommandBar` instead.
 *
 * @example
 * <CommandInput ref={ref} placeholder="Typ een commando…" value={cmd} onChange={onChange} />
 */
const CommandInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex-1 min-w-0 rounded-aether border border-border bg-background px-4 py-3 text-sm text-foreground',
        'placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-fast',
        'focus:border-primary focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
        'sm:px-6 sm:py-3.5',
        className,
      )}
      {...props}
    />
  ),
);

CommandInput.displayName = 'CommandInput';
export default CommandInput;
