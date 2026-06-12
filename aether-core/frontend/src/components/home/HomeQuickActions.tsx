import { Link } from 'react-router-dom';
import { Brain, ShieldCheck, Truck } from 'lucide-react';
import React from 'react';
import { Button, Badge } from '@/components/ui';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { cn } from '@/lib/utils';

const SUPPLIER_SYNC_COMMAND = 'Check leveranciers op prijsdalingen';

interface HomeQuickActionsProps {
  highRiskPendingCount: number;
  onSyncSuppliers: () => void;
}

export default function HomeQuickActions({
  highRiskPendingCount,
  onSyncSuppliers,
}: HomeQuickActionsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 pt-2"
      data-testid="home-quick-actions"
      role="group"
      aria-label={t('a11y.quickActions')}
    >
      <Button variant="secondary" size="sm" className={cn('h-9 rounded-xl gap-2')} asChild>
        <Link to={moduleLinks.approvals}>
          <ShieldCheck size={15} strokeWidth={1.75} />
          {t('home.quickActions.approvals')}
          {highRiskPendingCount > 0 && (
            <Badge variant="warning" className="ml-0.5 text-[10px] px-1.5 py-0">
              {highRiskPendingCount}
            </Badge>
          )}
        </Link>
      </Button>
      <Button variant="ghost" size="sm" className="h-9 rounded-xl gap-2" asChild>
        <Link to={moduleLinks.insights}>
          <Brain size={15} strokeWidth={1.75} />
          {t('home.quickActions.insights')}
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 rounded-xl gap-2"
        onClick={onSyncSuppliers}
        data-testid="home-quick-sync-suppliers"
      >
        <Truck size={15} strokeWidth={1.75} />
        {t('home.quickActions.syncSuppliers')}
      </Button>
      <span className="sr-only">{SUPPLIER_SYNC_COMMAND}</span>
    </div>
  );
}
