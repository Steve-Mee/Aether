import { Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, TenantApprovalPolicy } from '../../lib/api';
import { useAsyncData } from '../../lib/useAsyncData';
import { t } from '../../lib/i18n';
import InsightState from '../ui/InsightState';

export default function AutoRunWindowCard() {
  const { data: policy } = useAsyncData(async () => {
    const res = await apiFetch<{ policy: TenantApprovalPolicy }>('/api/admin/policies/approval');
    return res.policy;
  });

  if (!policy?.enabled || !policy.autoApproveLowRisk) return null;

  return (
    <InsightState variant="active">
      <div className="flex gap-3">
        <Zap size={18} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{t('cockpit.autoRun.title')}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('cockpit.autoRun.detail')}</p>
          <Link to="/settings" className="text-xs text-[var(--color-intent)] hover:underline mt-2 inline-block">
            {t('cockpit.autoRun.settings')} →
          </Link>
        </div>
      </div>
    </InsightState>
  );
}
