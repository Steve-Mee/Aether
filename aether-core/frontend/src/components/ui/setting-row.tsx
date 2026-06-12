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

function mergeDescribedBy(child: React.ReactElement, descriptionId: string): React.ReactElement {
  const existing = child.props['aria-describedby'] as string | undefined;
  return React.cloneElement(child, {
    'aria-describedby': existing ? `${existing} ${descriptionId}` : descriptionId,
  });
}

export function SettingRow({ label, description, children, className, htmlFor }: SettingRowProps) {
  const descriptionId = useId();
  const enhancedChildren =
    description && React.isValidElement(children)
      ? mergeDescribedBy(children, descriptionId)
      : children;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6 py-4 border-b border-border/30 last:border-0',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="text-body font-medium text-foreground block">
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
