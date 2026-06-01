import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white',
  secondary:
    'bg-[var(--color-surface-elevated)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border-subtle)]',
  ghost: 'bg-transparent hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]',
  success: 'bg-[var(--color-success)] hover:opacity-90 text-white',
  danger: 'bg-[var(--color-danger)] hover:opacity-90 text-white',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-[var(--radius-md)]',
  md: 'px-4 py-2 text-sm rounded-[var(--radius-lg)]',
  lg: 'px-6 py-3 text-sm rounded-[var(--radius-xl)]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`font-medium transition-all active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
