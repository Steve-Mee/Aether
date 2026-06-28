import { CheckCircle2, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui';

interface ApprovalSuccessBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ApprovalSuccessBanner({ message, onDismiss }: ApprovalSuccessBannerProps) {
  return (
    <div
      data-testid="approvals-success-banner"
      className="mb-6 flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-3 motion-safe:animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 size={18} className="text-success shrink-0" />
      <p className="text-sm text-foreground flex-1">{message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onDismiss}
        aria-label="Sluiten"
      >
        <X size={16} />
      </Button>
    </div>
  );
}
