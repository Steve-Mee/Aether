import { Link } from 'react-router-dom';
import { RefreshCw, ExternalLink } from 'lucide-react';
import React, { useId } from 'react';
import {
  Button,
  Badge,
  Skeleton,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Switch,
} from '@/components/ui';
import { formatDate, t } from '@/lib/i18n';
import {
  formatChangeSummary,
  formatSyncSourceLabel,
  formatSyncTime,
} from '@/lib/suppliersPresentation';
import type { SupplierDetail } from '@/types/supplier';

interface SupplierDetailSheetProps {
  detail: SupplierDetail | null;
  loading: boolean;
  open: boolean;
  monitoring: boolean;
  onClose: () => void;
  onSync: () => void;
  onAutoSyncChange: (enabled: boolean) => void;
}

export default function SupplierDetailSheet({
  detail,
  loading,
  open,
  monitoring,
  onClose,
  onSync,
  onAutoSyncChange,
}: SupplierDetailSheetProps) {
  const autoSyncId = useId();

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        data-testid="supplier-detail-sheet"
        className="flex flex-col w-full sm:max-w-md p-0 gap-0"
        aria-describedby={undefined}
      >
        <SheetHeader className="p-6 border-b border-border/40 space-y-0">
          <SheetTitle className="text-title font-semibold tracking-tight truncate pr-8">
            {detail?.name ?? t('suppliers.detail.loading')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading && (
            <div className="space-y-4" aria-busy="true" aria-label={t('suppliers.detail.loading')}>
              <Skeleton className="h-5 w-3/4" variant="text" />
              <Skeleton className="h-4 w-full" variant="text" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          )}

          {detail && !loading && (
            <>
              <div>
                <a
                  href={detail.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {detail.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={14} aria-hidden />
                </a>
                <p className="text-meta text-muted-foreground mt-2">
                  {t('suppliers.detail.skus').replace('{count}', String(detail.productCount))}
                  {detail.lastSyncAt &&
                    ` · ${t('suppliers.detail.lastSync')} ${formatDate(detail.lastSyncAt)}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={monitoring}
                  onClick={onSync}
                  className="gap-1.5"
                >
                  <RefreshCw size={14} className={monitoring ? 'animate-spin' : ''} aria-hidden />
                  {t('suppliers.detail.syncNow')}
                </Button>
                <Link
                  to="/timeline"
                  state={{ presetCategory: 'supplier' }}
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  onClick={onClose}
                >
                  {t('suppliers.detail.activityLog')}
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-card/30 px-4 py-3">
                <label htmlFor={autoSyncId} className="cursor-pointer">
                  <p className="text-body font-medium">{t('suppliers.detail.autoSync')}</p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    {t('suppliers.detail.autoSyncHint')}
                  </p>
                </label>
                <Switch
                  id={autoSyncId}
                  checked={detail.autoSyncEnabled}
                  onCheckedChange={onAutoSyncChange}
                  data-testid="supplier-autosync-toggle"
                  aria-label={t('a11y.autoSync')}
                />
              </div>

              <section data-testid="supplier-recent-syncs">
                <h3 className="text-body font-medium mb-3">{t('suppliers.detail.syncs')}</h3>
                {!detail.recentSyncs?.length ? (
                  <p className="text-caption text-muted-foreground">
                    {t('suppliers.detail.noSyncs')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.recentSyncs.map((s) => {
                      const time = formatSyncTime(s.at);
                      return (
                        <li
                          key={s.id}
                          className="rounded-lg border border-border/35 px-3 py-2.5 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-body font-medium">
                              {formatSyncSourceLabel(s.source)}
                            </span>
                            <span className="text-meta text-muted-foreground" title={time.absolute}>
                              {time.relative}
                            </span>
                          </div>
                          {(s.productsFound != null || s.changeCount != null) && (
                            <p className="text-caption text-muted-foreground mt-1">
                              {s.productsFound != null &&
                                t('suppliers.detail.syncProducts').replace(
                                  '{n}',
                                  String(s.productsFound),
                                )}
                              {s.changeCount != null &&
                                s.changeCount > 0 &&
                                ` · ${t('suppliers.detail.syncChanges').replace('{n}', String(s.changeCount))}`}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-body font-medium mb-3">{t('suppliers.detail.changes')}</h3>
                {detail.recentChanges.length === 0 ? (
                  <p className="text-caption text-muted-foreground">
                    {t('suppliers.detail.noChanges')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.recentChanges.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border border-border/35 px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {c.changeType.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-meta text-muted-foreground">
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-body text-foreground/90 mt-1.5">
                          {formatChangeSummary(c.changeType, c.payload)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-body font-medium mb-3">{t('suppliers.detail.products')}</h3>
                {detail.recentProducts.length === 0 ? (
                  <p className="text-caption text-muted-foreground">
                    {t('suppliers.detail.noProducts')}
                  </p>
                ) : (
                  <div className="rounded-xl border border-border/35 overflow-hidden">
                    <table className="w-full text-sm">
                      <caption className="sr-only">{t('suppliers.detail.products')}</caption>
                      <thead>
                        <tr className="border-b border-border/35 bg-muted/20 text-meta text-muted-foreground">
                          <th scope="col" className="text-left px-3 py-2 font-medium">
                            SKU
                          </th>
                          <th scope="col" className="text-left px-3 py-2 font-medium">
                            {t('suppliers.detail.product')}
                          </th>
                          <th scope="col" className="text-right px-3 py-2 font-medium">
                            {t('suppliers.detail.price')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.recentProducts.map((p) => (
                          <tr key={p.id} className="border-b border-border/25 last:border-0">
                            <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                              {p.sku}
                            </td>
                            <td className="px-3 py-2">{p.name}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              € {p.currentPrice.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
