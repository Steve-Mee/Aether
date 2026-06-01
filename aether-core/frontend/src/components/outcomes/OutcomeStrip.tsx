import React from 'react';
import { useDashboard } from '../../lib/DashboardContext';
import { formatCurrency, t } from '../../lib/i18n';
import MetricDelta from '../ui/MetricDelta';
import SkeletonPulse from '../ui/SkeletonPulse';

export default function OutcomeStrip() {
  const { data } = useDashboard();

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonPulse key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const timeSavedMin = data.timeSavedMinutes7d ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <MetricDelta
        label={t('cockpit.outcomeStrip.uplift')}
        value={formatCurrency(data.revenueUplift30d)}
        context={data.revenueUplift30d > 0 ? 'Geverifieerd' : 'Nog geen uplift geregistreerd'}
        trend={data.revenueUplift30d > 0 ? 'up' : 'neutral'}
      />
      <MetricDelta
        label={t('cockpit.outcomeStrip.approvals')}
        value={String(data.pendingApprovals)}
        context={data.pendingApprovals > 0 ? 'Actie vereist' : 'Geen openstaand'}
        urgent={data.pendingApprovals > 0}
        trend={data.pendingApprovals > 0 ? 'down' : 'up'}
      />
      <MetricDelta
        label={t('cockpit.outcomeStrip.mails')}
        value={String(data.unreadEmails)}
        context={
          data.emailMetrics
            ? `${Math.round(data.emailMetrics.classificationRate * 100)}% geclassificeerd`
            : 'Inbox'
        }
      />
      <MetricDelta
        label={t('cockpit.outcomeStrip.margin')}
        value={String(data.lowMarginProducts)}
        context={data.lowMarginProducts > 0 ? 'Optimalisatie beschikbaar' : 'Geen alerts'}
        urgent={data.lowMarginProducts > 0}
      />
      <MetricDelta
        label={t('cockpit.outcomeStrip.time')}
        value={timeSavedMin > 0 ? `${timeSavedMin} min` : '—'}
        context={t('cockpit.outcomeStrip.timeVerified')}
        trend={timeSavedMin > 0 ? 'up' : 'neutral'}
      />
    </div>
  );
}
