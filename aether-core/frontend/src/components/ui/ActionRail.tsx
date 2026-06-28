import { ReactNode } from 'react';
import React from 'react';
import { Button } from './Button';

interface ActionRailProps {
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  disabled?: boolean;
}

export default function ActionRail({
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  disabled,
}: ActionRailProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex gap-2 shrink-0">
        {secondaryLabel && onSecondary && (
          <Button variant="ghost" size="sm" onClick={onSecondary} disabled={disabled}>
            {secondaryLabel}
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onPrimary} disabled={disabled}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
