import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatChip } from '@/components/ui/page-header';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import { cn, focusRing } from '@/lib/utils';

interface SuppliersPageHeaderProps {
  pendingChangeCount: number;
}

export default function SuppliersPageHeader({ pendingChangeCount }: SuppliersPageHeaderProps) {
  return (
    <PageHeader
      title={t('nav.suppliers')}
      subtitle={t('suppliers.subtitle')}
      featureKey="supplier-intelligence"
    >
      {pendingChangeCount > 0 && (
        <StatChip>
          {t('suppliers.stat.recentChanges').replace('{count}', String(pendingChangeCount))}
        </StatChip>
      )}
      <Link
        to={moduleLinks.approvals}
        className={cn(
          'inline-flex items-center h-8 px-3 rounded-lg text-meta',
          'text-muted-foreground hover:text-foreground hover:bg-muted/25 transition-colors duration-fast',
          focusRing(),
        )}
      >
        {t('suppliers.link.approvals')}
      </Link>
    </PageHeader>
  );
}
