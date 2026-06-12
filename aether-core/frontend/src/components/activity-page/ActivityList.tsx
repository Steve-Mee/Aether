import React from 'react';
import type { ActivityDateGroup } from '@/lib/activityPresentation';
import { t } from '@/lib/i18n';
import ActivityRowCard from './ActivityRowCard';

interface ActivityListProps {
  groups: ActivityDateGroup[];
  onSelect: (id: string) => void;
}

export default function ActivityList({ groups, onSelect }: ActivityListProps) {
  return (
    <ul
      className="space-y-8"
      data-testid="activity-list"
      role="list"
      aria-label={t('activity.listLabel')}
    >
      {groups.map((group) => (
        <li key={group.key}>
          <h2 className="text-title font-medium text-foreground mb-3 sticky top-0 bg-background/90 backdrop-blur-sm py-1 z-[1]">
            {group.label}
          </h2>
          <ul className="space-y-3" role="list">
            {group.items.map((item) => (
              <li key={item.id}>
                <ActivityRowCard item={item} onSelect={() => onSelect(item.id)} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
