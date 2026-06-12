import { Link, useLocation } from 'react-router-dom';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { resolveSidecarBoostId } from '@/lib/navigation/routes';

import {
  AlertTriangle,
  Mail,
  Minus,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useApprovalMutations } from '@/features/approvals/hooks/useApprovalMutations';

import type { DashboardSummary } from '../lib/api';

import { useDashboard } from '../lib/DashboardContext';

import { formatCurrency, t } from '../lib/i18n';

import { Button } from '@/components/ui';

import { Card } from '@/components/ui';

import { cn, focusRing, interactiveSurface } from '@/lib/utils';

import { isCommandCenterHome } from './navigation/AppNavConfig';

import { useRouteContext } from '@/lib/RouteContext';

interface Signal {
  id: string;

  severity: 'info' | 'warning' | 'action';

  title: string;

  detail: string;

  href: string;

  icon: React.ReactNode;
}

function buildSignals(data: DashboardSummary): Signal[] {
  const signals: Signal[] = [];

  if (data.pendingApprovals > 0) {
    const titleKey =
      data.pendingApprovals > 1
        ? 'sidecar.signal.approvals.titlePlural'
        : 'sidecar.signal.approvals.title';

    signals.push({
      id: 'approvals',

      severity: 'action',

      title: t(titleKey).replace('{count}', String(data.pendingApprovals)),

      detail: t('sidecar.signal.approvals.detail'),

      href: moduleLinks.approvals,

      icon: <ShieldCheck size={15} strokeWidth={1.75} />,
    });
  }

  if (data.lowMarginProducts > 0) {
    signals.push({
      id: 'margin',

      severity: 'warning',

      title: t('sidecar.signal.margin.title').replace('{count}', String(data.lowMarginProducts)),

      detail: t('sidecar.signal.margin.detail'),

      href: moduleLinks.products,

      icon: <Package size={15} strokeWidth={1.75} />,
    });
  }

  if (data.unreadEmails > 0) {
    signals.push({
      id: 'mail',

      severity: 'info',

      title: t('sidecar.signal.mail.title').replace('{count}', String(data.unreadEmails)),

      detail: data.emailMetrics
        ? t('sidecar.signal.mail.detailClassified').replace(
            '{percent}',

            String(Math.round(data.emailMetrics.classificationRate * 100)),
          )
        : t('sidecar.signal.mail.detailInbox'),

      href: moduleLinks.emails,

      icon: <Mail size={15} strokeWidth={1.75} />,
    });
  }

  if (data.revenueUplift30d > 0) {
    signals.push({
      id: 'uplift',

      severity: 'info',

      title: t('sidecar.signal.uplift.title').replace(
        '{amount}',
        formatCurrency(data.revenueUplift30d),
      ),

      detail: t('sidecar.signal.uplift.detail'),

      href: moduleLinks.outcomes,

      icon: <TrendingUp size={15} strokeWidth={1.75} />,
    });
  }

  if (data.autonomyRate != null && !data.autonomyTargetMet) {
    signals.push({
      id: 'autonomy',

      severity: 'warning',

      title: t('sidecar.signal.autonomy.title').replace(
        '{percent}',

        String(Math.round(data.autonomyRate * 100)),
      ),

      detail: t('sidecar.signal.autonomy.detail'),

      href: moduleLinks.autonomous,

      icon: <AlertTriangle size={15} strokeWidth={1.75} />,
    });
  }

  return signals;
}

function prioritizeForRoute(signals: Signal[], pathname: string): Signal[] {
  const boostId = resolveSidecarBoostId(pathname);

  if (!boostId) return signals;

  return [...signals].sort((a, b) => {
    if (a.id === boostId) return -1;

    if (b.id === boostId) return 1;

    return 0;
  });
}

const severityBorder: Record<Signal['severity'], string> = {
  info: 'border-l-muted-foreground/30',

  warning: 'border-l-warning/30',

  action: 'border-l-destructive/40',
};

interface ProactiveSidecarProps {
  compact?: boolean;
}

export default function ProactiveSidecar({ compact = false }: ProactiveSidecarProps) {
  const location = useLocation();
  const { runAutoApply, isPending: autoApplyPending } = useApprovalMutations({
    showSuccessFeedback: false,
  });

  const { data, connected } = useDashboard();

  const onHome = isCommandCenterHome(location.pathname);

  const [collapsed, setCollapsed] = useState(onHome);

  useEffect(() => {
    if (isCommandCenterHome(location.pathname)) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  const handleAutoApply = async () => {
    try {
      await runAutoApply();
    } catch {
      /* mutation onError handles toast */
    }
  };

  const signals = data ? prioritizeForRoute(buildSignals(data), location.pathname) : [];

  const widthClass = compact ? 'w-60' : 'w-80';

  if (collapsed) {
    return (
      <aside
        aria-label={t('sidecar.title')}
        className={cn(
          'hidden lg:flex flex-col items-center py-4 shrink-0',

          'border-l border-border/15 command-center-canvas',

          compact ? 'w-11' : 'w-12',
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={cn(
            'p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors duration-200',

            focusRing(),
          )}
          aria-label={t('sidecar.expand')}
        >
          <Sparkles size={18} strokeWidth={1.75} />

          {signals.some((s) => s.severity === 'action') && (
            <span className="block w-1.5 h-1.5 bg-destructive/80 rounded-full mx-auto mt-1.5" />
          )}
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label={t('sidecar.title')}
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-l border-border/15',

        onHome ? 'command-center-canvas' : 'panel-surface',

        widthClass,
      )}
    >
      <div className="px-5 pt-7 pb-3 flex items-center justify-between border-b border-border/15">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground flex items-center gap-2">
          <Sparkles size={14} strokeWidth={1.75} />

          {t('sidecar.title')}
        </h2>

        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi size={13} className="text-muted-foreground/55" aria-label="Live stream" />
          ) : (
            <WifiOff size={13} className="text-muted-foreground/40" aria-label="Polling fallback" />
          )}

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className={cn(
              'text-muted-foreground/45 hover:text-muted-foreground rounded p-0.5 transition-colors duration-200',

              focusRing(),
            )}
            aria-label={t('sidecar.collapse')}
          >
            <Minus size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-2.5">
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-2">{t('sidecar.calm')}</p>
        ) : (
          signals.map((signal) => (
            <Link key={signal.id} to={signal.href} className={cn('block', focusRing('rounded-xl'))}>
              <Card
                className={cn(
                  interactiveSurface(),

                  'rounded-xl border-border/25 bg-card/40 insight-card-shadow',

                  'p-0 shadow-none hover:bg-card/55 hover:border-border/35 border-l-2',

                  severityBorder[signal.severity],
                )}
              >
                <div className="flex gap-2.5 px-4 py-3">
                  <div className="mt-0.5 text-muted-foreground/75">{signal.icon}</div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {signal.title}
                    </p>

                    <p className="text-[11px] text-muted-foreground/65 mt-0.5 leading-relaxed">
                      {signal.detail}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}

        {signals.some((s) => s.severity === 'action') && (
          <div className="space-y-2 pt-2">
            <Button
              size="sm"
              className="w-full h-9 rounded-lg"
              disabled={autoApplyPending}
              onClick={() => void handleAutoApply()}
            >
              {autoApplyPending ? '…' : t('sidecar.autoApply')}
            </Button>

            <Button variant="premium" size="sm" className="w-full h-9 rounded-lg" asChild>
              <Link to={moduleLinks.workstream}>{t('sidecar.applySafe')}</Link>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Wrapper that passes compact mode on Command Center home. */

export function ProactiveSidecarWithContext() {
  const { pathname } = useLocation();

  const { density } = useRouteContext();

  const compact = density === 'compact' || isCommandCenterHome(pathname);

  return <ProactiveSidecar compact={compact} />;
}
