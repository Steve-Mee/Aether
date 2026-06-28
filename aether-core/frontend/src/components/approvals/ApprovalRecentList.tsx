import React from 'react';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { t, formatDate } from '@/lib/i18n';
import ApprovalCard from './ApprovalCard';
import type { EnrichedApproval } from '@/lib/approvalPresentation';
import type { HandledOutcome } from '@/types/approval';

export interface RecentEnrichedItem extends EnrichedApproval {
  handledAt: string;
  outcome: HandledOutcome;
}

interface ApprovalRecentListProps {
  items: RecentEnrichedItem[];
}

export default function ApprovalRecentList({ items }: ApprovalRecentListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        variant="premium"
        icon={<History size={28} strokeWidth={1.5} />}
        title={t('approvals.empty.recent')}
        description={t('approvals.empty.recentDesc')}
      />
    );
  }

  return (
    <ul role="list" className="space-y-4" data-testid="approvals-recent-list">
      {items.map((enriched, index) => {
        const outcomeLabel =
          enriched.outcome === 'approved'
            ? `${t('approvals.recent.approved')} · ${formatDate(enriched.handledAt)}`
            : `${t('approvals.recent.rejected')} · ${formatDate(enriched.handledAt)}`;
        return (
          <li
            key={`${enriched.item.id}-${enriched.handledAt}`}
            className="motion-safe:opacity-0 animate-fade-in motion-safe:[animation-fill-mode:forwards]"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <ApprovalCard
              enriched={enriched}
              readOnly
              outcomeLabel={outcomeLabel}
              onApprove={() => {}}
              onReject={() => {}}
            />
          </li>
        );
      })}
    </ul>
  );
}
