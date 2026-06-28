import { AlertTriangle, ExternalLink, Package } from 'lucide-react';
import React from 'react';
import { Badge, Button, Card } from '@/components/ui';
import { cn, focusRing } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { formatSupplierType, formatSyncTime } from '@/lib/suppliersPresentation';
import type { SupplierListItem, SupplierMonitoringLabel } from '@/types/supplier';

const monitoringKeys: Record<SupplierMonitoringLabel, string> = {
  active: 'suppliers.status.active',
  sync_on: 'suppliers.status.syncOn',
  disabled: 'suppliers.status.disabled',
};

const monitoringVariants: Record<SupplierMonitoringLabel, 'success' | 'default' | 'muted'> = {
  active: 'default',
  sync_on: 'success',
  disabled: 'muted',
};

interface SupplierCardProps {
  supplier: SupplierListItem;
  onOpen: (id: string) => void;
  highlighted?: boolean;
}

export default function SupplierCard({ supplier, onOpen, highlighted }: SupplierCardProps) {
  const typeLabel = formatSupplierType(supplier.supplierType);
  const syncDisplay = formatSyncTime(supplier.lastAutoSyncAt ?? supplier.lastSyncAt);
  const highlight = supplier.hasRecentImportantChange || highlighted;

  return (
    <Card
      variant="elevated"
      padding="md"
      data-testid={`supplier-card-${supplier.id}`}
      className={cn(highlight && 'border-warning/40 animate-highlight-pulse')}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title font-medium tracking-tight">{supplier.name}</h3>
            {supplier.hasRecentPriceDrop && (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle size={11} aria-hidden />
                {t('suppliers.badge.priceDrop')}
              </Badge>
            )}
            {supplier.hasRecentStockChange && !supplier.hasRecentPriceDrop && (
              <Badge variant="warning" className="gap-1">
                <Package size={11} aria-hidden />
                {t('suppliers.badge.stockChange')}
              </Badge>
            )}
            {supplier.hasRecentImportantChange &&
              !supplier.hasRecentPriceDrop &&
              !supplier.hasRecentStockChange && (
                <Badge variant="outline">{t('suppliers.badge.change')}</Badge>
              )}
          </div>
          <a
            href={supplier.website}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'text-caption text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1',
              focusRing('rounded px-0.5'),
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {supplier.website.replace(/^https?:\/\//, '')}
            <ExternalLink size={12} aria-hidden />
          </a>
          {typeLabel && <p className="text-meta text-muted-foreground/80 mt-1">{typeLabel}</p>}
        </div>
        <Badge variant={monitoringVariants[supplier.monitoringLabel]}>
          {t(monitoringKeys[supplier.monitoringLabel])}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-caption text-muted-foreground">
        <div>
          <p className="text-meta uppercase tracking-wide text-caption-accessible">
            {t('suppliers.card.skus')}
          </p>
          <p className="text-body font-medium text-foreground tabular-nums">
            {supplier.productCount}
          </p>
        </div>
        <div>
          <p className="text-meta uppercase tracking-wide text-caption-accessible">
            {t('suppliers.card.lastSync')}
          </p>
          <p className="text-body font-medium text-foreground">{syncDisplay.relative}</p>
        </div>
        <div>
          <p className="text-meta uppercase tracking-wide text-caption-accessible">
            {t('suppliers.card.changes')}
          </p>
          <p className="text-body font-medium text-foreground tabular-nums">
            {supplier.recentChangeCount}
          </p>
        </div>
        <div>
          <p className="text-meta uppercase tracking-wide text-caption-accessible">
            {t('suppliers.card.autoSync')}
          </p>
          <p className="text-body font-medium text-foreground">
            {supplier.autoSyncEnabled ? t('suppliers.card.on') : t('suppliers.card.off')}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={cn('mt-4', focusRing())}
        onClick={() => onOpen(supplier.id)}
        aria-label={`${t('suppliers.detail.title')}: ${supplier.name}`}
      >
        {t('suppliers.card.openDetail')}
      </Button>
    </Card>
  );
}
