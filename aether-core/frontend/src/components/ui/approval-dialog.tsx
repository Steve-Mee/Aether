import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from './Button';
import { ConfidenceBadge } from './confidence-badge';
import { Badge } from './badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { t } from '@/lib/i18n';
import type { RiskBand } from '@/lib/intentNavigation';

const riskVariant: Record<RiskBand, 'riskLow' | 'riskMedium' | 'riskHigh'> = {
  low: 'riskLow',
  medium: 'riskMedium',
  high: 'riskHigh',
};

export interface ApprovalDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Gate heading (defaults to approval.gate.title) */
  gateTitle?: string;
  title: string;
  detail: string;
  riskBand: RiskBand;
  confidence: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

/**
 * Gated approval overlay for high-risk autonomous actions.
 * Prefer over custom modals — includes focus trap and risk/confidence display.
 *
 * @example
 * <ApprovalDialog open={open} title="Bulk prijsupdate" detail="23 SKU" riskBand="high"
 *   confidence={0.72} onConfirm={confirm} onCancel={() => setOpen(false)} />
 */
export function ApprovalDialog({
  open,
  onOpenChange,
  title,
  detail,
  riskBand,
  confidence,
  onConfirm,
  onCancel,
  loading,
  gateTitle,
  confirmLabel,
  confirmVariant = 'primary',
}: ApprovalDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange?.(next);
      }}
    >
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-warning shrink-0" size={24} />
            <DialogTitle>{gateTitle ?? t('approval.gate.title')}</DialogTitle>
          </div>
          <p className="text-sm font-medium text-foreground pt-2">{title}</p>
          <DialogDescription className="pt-1">{detail}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{t('approval.gate.risk')}</span>
          <Badge variant={riskVariant[riskBand]}>{t(`risk.${riskBand}`)}</Badge>
          <ConfidenceBadge confidence={confidence} />
        </div>
        <DialogFooter className="gap-3 sm:gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
            {t('approval.gate.cancel')}
          </Button>
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel ?? t('approval.gate.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApprovalDialog;
