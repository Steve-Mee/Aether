import { ReactNode } from 'react';
import React from 'react';
import Button from './Button';

interface EmptyStatePremiumProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export default function EmptyStatePremium({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStatePremiumProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50">
      {icon && <div className="mb-4 text-[var(--color-accent)] opacity-80">{icon}</div>}
      <h3 className="text-lg font-medium text-[var(--color-text)]">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-md">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="secondary" size="md" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
