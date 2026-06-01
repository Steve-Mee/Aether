import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import RiskBadge from './ui/RiskBadge';
import ExplainDrawer from './ExplainDrawer';
import { assessApprovalRisk } from '../lib/intentNavigation';
import { formatDate, t } from '../lib/i18n';

export interface ApprovalItem {
  id: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}

interface EmailPayload {
  emailId?: string;
  from?: string;
  subject?: string;
  category?: string;
  context?: {
    customerEmail?: string;
    priorEmailCount?: number;
    source?: string;
  };
}

interface DecisionCardProps {
  approval: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  resolving?: boolean;
}

function summarizeImpact(module: string, actionType: string): string {
  if (module === 'aether-mail') {
    return 'AETHER stelt een mailactie voor op basis van classificatie en klantcontext.';
  }
  if (/price|prijs/.test(actionType)) {
    return 'Prijsaanpassing kan marge en conversie beïnvloeden — controleer impact.';
  }
  if (/supplier/.test(module)) {
    return 'Leverancierswijziging synchroniseert catalogus en voorraad.';
  }
  return 'Autonome actie wacht op jouw beslissing.';
}

function toEmailPayload(payload: Record<string, unknown>): EmailPayload {
  return payload as EmailPayload;
}

export default function DecisionCard({
  approval,
  onApprove,
  onReject,
  resolving,
}: DecisionCardProps) {
  const [explainOpen, setExplainOpen] = useState(false);
  const email = toEmailPayload(approval.payload);
  const risk = assessApprovalRisk(approval.module, approval.actionType);
  const entityId = email.emailId ?? approval.id;

  return (
    <>
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">{approval.module}</span>
          <span className="text-[var(--color-text-subtle)]">·</span>
          <span className="text-sm text-[var(--color-text-muted)]">{approval.actionType}</span>
          <RiskBadge band={risk} className="ml-auto" />
        </div>

        <div className="bg-[var(--color-bg)]/50 border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4 space-y-2">
          <p className="text-sm text-[var(--color-text-muted)]">{summarizeImpact(approval.module, approval.actionType)}</p>

          {email.from && (
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-[var(--color-text-subtle)]">Van:</span> {email.from}
            </p>
          )}
          {email.subject && (
            <p className="text-sm text-[var(--color-text-muted)]">
              <span className="text-[var(--color-text-subtle)]">Onderwerp:</span> {email.subject}
            </p>
          )}
          {email.category && (
            <span className="inline-block text-xs px-2 py-1 rounded-md bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
              {email.category}
            </span>
          )}
          <p className="text-xs text-[var(--color-text-subtle)]">{formatDate(approval.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="success"
            size="md"
            disabled={resolving}
            onClick={() => onApprove(approval.id)}
          >
            {t('approval.approve')}
          </Button>
          <Button
            variant="danger"
            size="md"
            disabled={resolving}
            onClick={() => onReject(approval.id)}
          >
            {t('approval.reject')}
          </Button>
          <Button variant="ghost" size="md" onClick={() => setExplainOpen(true)}>
            <HelpCircle size={16} className="inline mr-1" />
            {t('approval.explain')}
          </Button>
        </div>
      </Card>

      <ExplainDrawer
        entityType={email.emailId ? 'email' : 'approval'}
        entityId={entityId}
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
      />
    </>
  );
}
