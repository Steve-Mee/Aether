import * as React from 'react';
import { cn, focusRing } from '@/lib/utils';

export interface SettingsSectionItem {
  id: string;
  label: string;
}

export interface SettingsSectionNavProps {
  sections: SettingsSectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

export function SettingsSectionNav({
  sections,
  activeId,
  onSelect,
  className,
  orientation = 'vertical',
}: SettingsSectionNavProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        isHorizontal ? 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1' : 'flex flex-col gap-1',
        className,
      )}
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          data-testid={`settings-nav-${section.id}`}
          aria-current={activeId === section.id ? 'true' : undefined}
          className={cn(
            'text-sm font-medium transition-colors duration-150 rounded-lg text-left whitespace-nowrap',
            focusRing(),
            isHorizontal ? 'px-4 py-2 shrink-0' : 'px-3 py-2.5 w-full',
            activeId === section.id
              ? 'bg-muted/40 text-foreground'
              : 'text-muted-foreground hover:bg-muted/25 hover:text-foreground',
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
