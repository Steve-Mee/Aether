import React from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

const bulkBtnClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

interface ApprovalBulkBarProps {
  selectedCount: number;
  lowRiskCount: number;
  bulkLoading: boolean;
  onSelectAllLow: () => void;
  onApproveSelected: () => void;
  onAutoApplyAll: () => void;
  onClear: () => void;
  showAutoApply: boolean;
}

export default function ApprovalBulkBar({
  selectedCount,
  lowRiskCount,
  bulkLoading,
  onSelectAllLow,
  onApproveSelected,
  onAutoApplyAll,
  onClear,
  showAutoApply,
}: ApprovalBulkBarProps) {
  if (selectedCount === 0 && !showAutoApply) return null;

  return (
    <div
      data-testid="approvals-bulk-bar"
      className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/30 bg-card/90 backdrop-blur-md px-4 py-3 animate-fade-in"
      aria-live="polite"
      aria-atomic="true"
    >
      {selectedCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {t('approvals.bulk.selected').replace('{count}', String(selectedCount))}
        </span>
      )}
      <div className="flex flex-wrap gap-2 ml-auto">
        {lowRiskCount > 0 && selectedCount < lowRiskCount && (
          <Button
            variant="ghost"
            size="sm"
            disabled={bulkLoading}
            onClick={onSelectAllLow}
            className={cn(bulkBtnClass)}
          >
            {t('approvals.bulk.selectAllLow')}
          </Button>
        )}
        {selectedCount > 0 && (
          <>
            <Button
              variant="success"
              size="sm"
              disabled={bulkLoading}
              onClick={onApproveSelected}
              data-testid="approvals-bulk-approve-selected"
              className={cn(bulkBtnClass)}
            >
              {t('approvals.bulk.approveSelected')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkLoading}
              onClick={onClear}
              className={cn(bulkBtnClass)}
            >
              {t('approvals.bulk.clear')}
            </Button>
          </>
        )}
        {showAutoApply && lowRiskCount > 0 && (
          <Button
            variant="premium"
            size="sm"
            disabled={bulkLoading}
            onClick={onAutoApplyAll}
            data-testid="approvals-bulk-auto-apply"
            className={cn(bulkBtnClass)}
          >
            {t('approvals.bulk.autoApplyAll')}
          </Button>
        )}
      </div>
    </div>
  );
}
