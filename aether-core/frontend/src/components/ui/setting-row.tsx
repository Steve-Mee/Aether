import * as React from 'react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export function SettingRow({ label, description, children, className, htmlFor }: SettingRowProps) {
  const autoId = useId();
  const descriptionId = useId();
  const controlId = htmlFor ?? autoId;

  let enhancedChildren = children;
  if (React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    if (!childProps.id) next.id = controlId;
    if (!childProps['aria-label'] && !childProps['aria-labelledby']) {
      next['aria-label'] = label;
    }
    if (description) {
      const existing = childProps['aria-describedby'] as string | undefined;
      next['aria-describedby'] = existing ? `${existing} ${descriptionId}` : descriptionId;
    }
    enhancedChildren = React.cloneElement(children, next);
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6 py-4 border-b border-border/30 last:border-0',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={controlId} className="text-body font-medium text-foreground block">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-meta text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 sm:pt-0.5">{enhancedChildren}</div>
    </div>
  );
}
