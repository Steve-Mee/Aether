import { type ReactNode } from 'react';
import React from 'react';
import { t } from '../../lib/i18n';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="mb-4 text-[var(--color-text-subtle)]">{icon}</div>}
      <p className="text-lg font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="text-sm text-[var(--color-text-subtle)] mt-2 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState() {
  return <p className="text-[var(--color-text-subtle)] p-8">{t('async.loading')}</p>;
}
