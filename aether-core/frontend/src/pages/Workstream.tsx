import { Link } from 'react-router-dom';
import { Bot, Mail, ShieldCheck, Users } from 'lucide-react';
import React from 'react';
import { formatDate, t } from '../lib/i18n';
import { Card, EmptyState, ModuleListPageSkeleton, RiskBadge } from '@/components/ui';
import { cn, interactiveSurface } from '@/lib/utils';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import ActionRail from '../components/ui/ActionRail';
import { useWorkstreamPage } from '@/hooks/useWorkstreamPage';

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

export default function Workstream() {
  const { data, loading, error, reload, resolveApproval, resolving } = useWorkstreamPage();

  return (
    <ModulePageLayout
      title={t('workstream.title')}
      subtitle={t('workstream.subtitle')}
      featureKey="admin-command-bar"
      testId="workstream-page"
      loading={loading}
      error={error}
      onRetry={reload}
      skeleton={<ModuleListPageSkeleton />}
    >
      {!data || data.length === 0 ? (
        <EmptyState
          variant="premium"
          title={t('workstream.empty')}
          description={t('workstream.empty.hint')}
        />
      ) : (
        <div className="space-y-4 motion-safe:animate-fade-in">
          {data.map((item) => {
            const Icon = moduleIcons[item.module];
            const body = (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    {item.risk && <RiskBadge band={item.risk} />}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{item.detail}</p>
                </div>
              </div>
            );

            if (item.approvalId) {
              return (
                <Card key={item.id} className={cn(interactiveSurface(), 'hover:border-primary/30')}>
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
                <Card className={cn(interactiveSurface(), 'hover:border-primary/30')}>{body}</Card>
              </Link>
            );
          })}
        </div>
      )}
    </ModulePageLayout>
  );
}
