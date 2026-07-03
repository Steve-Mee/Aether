import React from 'react';
import type { ActivityDateGroup } from '@/lib/activityPresentation';
import { t } from '@/lib/i18n';
import type { ActivityItem } from '@/types/activity';
import ActivityRowCard from './ActivityRowCard';

interface ActivityListProps {
  groups: ActivityDateGroup[];
  onSelect: (id: string) => void;
  showInlineExplain?: boolean;
  onExplain?: (item: ActivityItem) => void;
}

export default function ActivityList({
  groups,
  onSelect,
  showInlineExplain,
  onExplain,
}: ActivityListProps) {
  return (
    <ul
      className="space-y-8"
      data-testid="activity-list"
      role="list"
      aria-label={t('activity.listLabel')}
    >
      {groups.map((group) => (
        <li key={group.key}>
          <div className="sticky top-0 z-[1] mb-3 flex items-center justify-between gap-3 bg-background/80 backdrop-blur-sm py-2 border-b border-border/20">
            <h2 className="text-title font-medium text-foreground">{group.label}</h2>
            <span className="text-caption text-muted-foreground tabular-nums">
              {t('activity.group.count').replace('{count}', String(group.items.length))}
            </span>
          </div>
          <ul className="space-y-3" role="list">
            {group.items.map((item) => (
              <li key={item.id}>
                <ActivityRowCard
                  item={item}
                  onSelect={() => onSelect(item.id)}
                  showInlineExplain={showInlineExplain}
                  onExplain={onExplain}
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
