import React from 'react';
import { ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import RiskBadge from '../ui/RiskBadge';
import { t } from '../../lib/i18n';

interface ApprovalGateModalProps {
  open: boolean;
  title: string;
  detail: string;
  riskBand: 'low' | 'medium' | 'high';
  confidence: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ApprovalGateModal({
  open,
  title,
  detail,
  riskBand,
  confidence,
  onConfirm,
  onCancel,
  loading,
}: ApprovalGateModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[80]" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-gate-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="text-[var(--color-warning)]" size={24} />
          <h2 id="approval-gate-title" className="text-lg font-semibold text-[var(--color-text)]">
            {t('approval.gate.title')}
          </h2>
        </div>
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">{detail}</p>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-[var(--color-text-subtle)]">{t('approval.gate.risk')}</span>
          <RiskBadge band={riskBand} />
          <ConfidenceBadge confidence={confidence} />
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" size="md" className="flex-1" onClick={onCancel} disabled={loading}>
            {t('approval.gate.cancel')}
          </Button>
          <Button variant="primary" size="md" className="flex-1" onClick={onConfirm} disabled={loading}>
            {t('approval.gate.confirm')}
          </Button>
        </div>
      </div>
    </>
  );
}
