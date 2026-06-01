import { forwardRef, InputHTMLAttributes } from 'react';
import React from 'react';

const CommandInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`flex-1 min-w-0 bg-[var(--color-bg)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-[var(--radius-xl)] px-4 sm:px-6 py-3 sm:py-3.5 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] text-sm transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus-visible:shadow-[var(--shadow-focus)] ${className}`}
      {...props}
    />
  )
);

CommandInput.displayName = 'CommandInput';
export default CommandInput;
