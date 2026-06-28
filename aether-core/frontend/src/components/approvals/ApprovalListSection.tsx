import React from 'react';
import { cn } from '@/lib/utils';
import ApprovalCard from './ApprovalCard';
import type { EnrichedApproval } from '@/lib/approvalPresentation';

interface ApprovalListSectionProps {
  title?: string;
  items: EnrichedApproval[];
  highRiskZone?: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  showCheckboxes: boolean;
  resolvingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  /** When false, high-risk cards show without approve/reject actions. */
  allowHighRiskActions?: boolean;
  highlightedId?: string | null;
}

export default function ApprovalListSection({
  title,
  items,
  highRiskZone,
  selectedIds,
  onToggleSelect,
  showCheckboxes,
  resolvingId,
  onApprove,
  onReject,
  allowHighRiskActions = true,
  highlightedId,
}: ApprovalListSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn('space-y-4', highRiskZone && 'rounded-2xl border border-warning/20 p-4 sm:p-5')}
    >
      {title && <h2 className="text-base font-medium tracking-tight text-foreground">{title}</h2>}
      <ul className="space-y-4" role="list">
        {items.map((enriched, index) => (
          <li
            key={enriched.item.id}
            className="motion-safe:opacity-0 animate-fade-in motion-safe:[animation-fill-mode:forwards]"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <ApprovalCard
              enriched={enriched}
              highlighted={highlightedId === enriched.item.id}
              selected={selectedIds.has(enriched.item.id)}
              onToggleSelect={() => onToggleSelect(enriched.item.id)}
              showCheckbox={showCheckboxes && enriched.riskBand === 'low'}
              resolving={resolvingId === enriched.item.id}
              onApprove={onApprove}
              onReject={onReject}
              allowHighRiskActions={allowHighRiskActions}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
