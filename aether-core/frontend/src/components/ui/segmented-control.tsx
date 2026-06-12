import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
  ariaDescribedBy?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'data-testid'?: string;
  /** Accessible name for the toggle group (required for WCAG) */
  'aria-label': string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  'data-testid': testId,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const enabledOptions = options.filter((opt) => !opt.disabled);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (enabledOptions.length === 0) return;
    const currentIndex = enabledOptions.findIndex((opt) => opt.value === value);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % enabledOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + enabledOptions.length) % enabledOptions.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = enabledOptions.length - 1;
    } else {
      return;
    }

    onChange(enabledOptions[nextIndex]!.value);
    const nextTestId = testId ? `${testId}-${enabledOptions[nextIndex]!.value}` : undefined;
    if (nextTestId) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLButtonElement>(`[data-testid="${nextTestId}"]`)?.focus();
      });
    }
  };

  return (
    <div
      className={cn('inline-flex flex-wrap gap-1 rounded-lg bg-muted/30 p-1', className)}
      data-testid={testId}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt) => {
        const isDisabled = opt.disabled === true;
        const isActive = value === opt.value && !isDisabled;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            title={opt.title}
            onClick={() => !isDisabled && onChange(opt.value)}
            aria-pressed={isActive}
            aria-disabled={isDisabled || undefined}
            aria-describedby={opt.ariaDescribedBy}
            data-testid={testId ? `${testId}-${opt.value}` : undefined}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
              isDisabled && 'opacity-45 cursor-not-allowed',
              isActive
                ? 'bg-surface-elevated text-foreground shadow-sm'
                : !isDisabled && 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
