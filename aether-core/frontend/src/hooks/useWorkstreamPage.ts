import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { DashboardSummary } from '@/lib/api';
import { approvalsApi } from '@/features/approvals/api';
import { useApprovalMutations } from '@/features/approvals/hooks/useApprovalMutations';
import { autonomousRepository, dashboardRepository, emailsRepository } from '@/lib/data';
import { enrichApproval } from '@/lib/approvalPresentation';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';
import type { ApprovalItem } from '@/types/approval';
import type { OutcomeItem } from '@/pages/Workstream';

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

function buildStream(
  approvals: ApprovalItem[],
  emails: EmailRow[],
  decisions: DecisionRow[],
  dashboard: DashboardSummary | null,
): OutcomeItem[] {
  const items: OutcomeItem[] = [];

  for (const a of approvals.filter((x) => x.status === 'pending')) {
    const enriched = enrichApproval(a);
    items.push({
      id: `approval-${a.id}`,
      approvalId: a.id,
      priority: enriched.riskBand === 'high' ? 100 : enriched.riskBand === 'medium' ? 80 : 60,
      module: a.module.includes('mail')
        ? 'mail'
        : a.module === 'admin-command-bar'
          ? 'autonomy'
          : a.module.includes('supplier')
            ? 'supplier'
            : 'commerce',
      title: enriched.title,
      detail: enriched.impact,
      href: '/approvals',
      risk: enriched.riskBand,
      createdAt: a.createdAt,
    });
  }

  for (const e of emails
    .filter((x) => x.status === 'escalated' || x.status === 'received')
    .slice(0, 5)) {
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

export function useWorkstreamPage() {
  const [resolving, setResolving] = useState<string | null>(null);

  const { resolveMutation, afterApprovalSuccess } = useApprovalMutations({
    onResolveSettled: () => setResolving(null),
    showSuccessFeedback: false,
    showResolveErrorToast: false,
  });

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.approvals.list(),
        queryFn: () => approvalsApi.list(),
      },
      {
        queryKey: queryKeys.emails.all(),
        queryFn: () => emailsRepository.list() as Promise<EmailRow[]>,
        meta: { domain: 'emails' },
      },
      {
        queryKey: queryKeys.autonomous(),
        queryFn: () => autonomousRepository.list() as Promise<DecisionRow[]>,
        meta: { domain: 'autonomous' },
      },
      {
        queryKey: queryKeys.dashboard(),
        queryFn: () => dashboardRepository.fetch(),
        staleTime: 15_000,
      },
    ],
  });

  const loading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;

  const approvals = results[0].data ?? [];

  const data = useMemo(() => {
    const emails = results[1].data ?? [];
    const decisions = results[2].data ?? [];
    const dashboard = results[3].data ?? null;
    return buildStream(approvals, emails, decisions, dashboard);
  }, [approvals, results]);

  const resolveApproval = async (id: string, approve: boolean) => {
    setResolving(id);
    await resolveMutation.mutateAsync({ id, approve });
    await afterApprovalSuccess('');
  };

  const reload = () => {
    void results.forEach((r) => r.refetch());
  };

  return {
    data,
    loading,
    error: aetherErrorMessage(error),
    reload,
    resolveApproval,
    resolving,
  };
}
