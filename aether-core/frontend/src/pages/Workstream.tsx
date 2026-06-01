import { Link } from 'react-router-dom';
import { Bot, Mail, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { apiFetch, DashboardSummary } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import { assessApprovalRisk } from '../lib/intentNavigation';
import { formatDate, t } from '../lib/i18n';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import Card from '../components/ui/Card';
import RiskBadge from '../components/ui/RiskBadge';
import EmptyStatePremium from '../components/ui/EmptyStatePremium';
import Button from '../components/ui/Button';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import ActionRail from '../components/ui/ActionRail';

interface ApprovalRow {
  id: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}

interface EmailRow {
  id: string;
  subject: string;
  from: string;
  status: string;
  category: string | null;
  createdAt: string;
}

interface DecisionRow {
  id: string;
  type: string;
  result: string;
  rationale: string | null;
  createdAt: string;
}

export interface OutcomeItem {
  id: string;
  priority: number;
  module: 'mail' | 'supplier' | 'autonomy' | 'commerce';
  title: string;
  detail: string;
  href: string;
  risk?: 'low' | 'medium' | 'high';
  createdAt: string;
  approvalId?: string;
}

const moduleIcons = {
  mail: Mail,
  supplier: Users,
  autonomy: Bot,
  commerce: ShieldCheck,
};

function buildStream(
  approvals: ApprovalRow[],
  emails: EmailRow[],
  decisions: DecisionRow[],
  dashboard: DashboardSummary | null
): OutcomeItem[] {
  const items: OutcomeItem[] = [];

  for (const a of approvals.filter((x) => x.status === 'pending')) {
    const risk = assessApprovalRisk(a.module, a.actionType);
    items.push({
      id: `approval-${a.id}`,
      approvalId: a.id,
      priority: risk === 'high' ? 100 : risk === 'medium' ? 80 : 60,
      module: a.module.includes('mail') ? 'mail' : a.module.includes('supplier') ? 'supplier' : 'commerce',
      title: `Goedkeuring: ${a.actionType}`,
      detail: a.module,
      href: '/approvals',
      risk,
      createdAt: a.createdAt,
    });
  }

  for (const e of emails.filter((x) => x.status === 'escalated' || x.status === 'received').slice(0, 5)) {
    items.push({
      id: `email-${e.id}`,
      priority: e.status === 'escalated' ? 90 : 50,
      module: 'mail',
      title: e.subject || 'E-mail zonder onderwerp',
      detail: `${e.from} · ${e.category ?? 'onbekend'}`,
      href: '/emails',
      risk: e.status === 'escalated' ? 'medium' : 'low',
      createdAt: e.createdAt,
    });
  }

  for (const d of decisions.slice(0, 5)) {
    items.push({
      id: `decision-${d.id}`,
      priority: 40,
      module: 'autonomy',
      title: d.type,
      detail: d.rationale ?? d.result,
      href: '/autonomous',
      risk: 'low',
      createdAt: d.createdAt,
    });
  }

  if (dashboard && dashboard.lowMarginProducts > 0) {
    items.push({
      id: 'margin-alert',
      priority: 70,
      module: 'commerce',
      title: `${dashboard.lowMarginProducts} producten met lage marge`,
      detail: 'Prijsoptimalisatie via commando',
      href: '/products',
      risk: 'medium',
      createdAt: new Date().toISOString(),
    });
  }

  return items.sort((a, b) => b.priority - a.priority);
}

export default function Workstream() {
  const [resolving, setResolving] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsyncData(async () => {
    const [approvals, emails, decisions, dashboard] = await Promise.all([
      apiFetch<ApprovalRow[]>('/api/approvals').catch(() => []),
      apiFetch<EmailRow[]>('/api/emails').catch(() => []),
      apiFetch<DecisionRow[]>('/api/autonomous').catch(() => []),
      apiFetch<DashboardSummary>('/api/admin/dashboard').catch(() => null),
    ]);
    return buildStream(approvals, emails, decisions, dashboard);
  });

  const resolveApproval = async (id: string, approve: boolean) => {
    setResolving(id);
    try {
      await apiFetch(`/api/approvals/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ approve }),
      });
      reload();
    } finally {
      setResolving(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">{t('workstream.title')}</h1>
        <FeatureStatusFromTruth featureKey="admin-command-bar" />
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {!data || data.length === 0 ? (
          <EmptyStatePremium
            title={t('workstream.empty')}
            description="Gebruik ⌘K om AETHER te vragen wat er speelt."
          />
        ) : (
          <div className="space-y-4">
            {data.map((item) => {
              const Icon = moduleIcons[item.module];
              const body = (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-[var(--color-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--color-text)]">{item.title}</p>
                      {item.risk && <RiskBadge band={item.risk} />}
                      <span className="text-xs text-[var(--color-text-subtle)] ml-auto">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1 truncate">{item.detail}</p>
                  </div>
                </div>
              );

              if (item.approvalId) {
                return (
                  <Card key={item.id} className="hover:border-[var(--color-accent)]/30 transition-colors">
                    <ActionRail
                      primaryLabel={t('approval.approve')}
                      onPrimary={() => void resolveApproval(item.approvalId!, true)}
                      secondaryLabel={t('approval.reject')}
                      onSecondary={() => void resolveApproval(item.approvalId!, false)}
                      disabled={resolving === item.approvalId}
                    >
                      {body}
                    </ActionRail>
                  </Card>
                );
              }

              return (
                <Link key={item.id} to={item.href} className="block focus-visible:outline-none">
                  <Card className="hover:border-[var(--color-accent)]/30 transition-colors">{body}</Card>
                </Link>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
