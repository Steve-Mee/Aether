import React from 'react';
import { Plus, Truck } from 'lucide-react';
import {
  AsyncBoundary,
  Button,
  EmptyState,
  ModuleListPageSkeleton,
  TextField,
} from '@/components/ui';
import SuppliersPageHeader from '@/components/suppliers-page/SuppliersPageHeader';
import SuppliersOverviewMetrics from '@/components/suppliers-page/SuppliersOverviewMetrics';
import SuppliersToolbar from '@/components/suppliers-page/SuppliersToolbar';
import SuppliersListSection from '@/components/suppliers-page/SuppliersListSection';
import SupplierDetailSheet from '@/components/suppliers-page/SupplierDetailSheet';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { useSuppliersPage } from '@/features/suppliers';
import { t } from '@/lib/i18n';

export default function Suppliers() {
  const page = useSuppliersPage();

  return (
    <ModulePageLayout
      testId="suppliers-page"
      header={<SuppliersPageHeader pendingChangeCount={page.pendingChangeCount} />}
      loading={false}
      error={null}
      wrapAsync={false}
    >
      <SuppliersOverviewMetrics stats={page.viewModel.stats} />

      <SuppliersToolbar
        activeTab={page.statusTab}
        onTabChange={page.setStatusTab}
        searchQuery={page.searchQuery}
        onSearchChange={page.setSearchQuery}
      />

      <div className="flex justify-end mb-4 -mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => page.setShowAddForm(!page.showAddForm)}
          data-testid="suppliers-add-toggle"
        >
          <Plus size={14} className="mr-1" />
          {t('suppliers.add.toggle')}
        </Button>
      </div>

      {page.showAddForm && (
        <form
          onSubmit={page.createSupplier}
          className="rounded-xl border border-border/40 bg-card/30 p-aether-6 space-y-3 motion-safe:animate-fade-in"
          data-testid="suppliers-add-form"
          aria-describedby={page.addFormError ? 'suppliers-add-error' : undefined}
        >
          {page.addFormError && (
            <p id="suppliers-add-error" role="alert" className="text-sm text-destructive">
              {page.addFormError}
            </p>
          )}
          <TextField
            value={page.newName}
            onChange={(e) => page.setNewName(e.target.value)}
            placeholder={t('suppliers.add.name')}
            aria-label={t('suppliers.add.name')}
            aria-invalid={page.addFormError ? true : undefined}
          />
          <TextField
            type="url"
            value={page.newWebsite}
            onChange={(e) => page.setNewWebsite(e.target.value)}
            placeholder={t('suppliers.add.website')}
            aria-label={t('suppliers.add.website')}
            aria-invalid={page.addFormError ? true : undefined}
          />
          <Button type="submit" variant="primary" size="sm" disabled={page.creating}>
            {t('suppliers.add.submit')}
          </Button>
        </form>
      )}

      <AsyncBoundary
        loading={page.loading}
        error={page.error}
        onRetry={page.reload}
        skeleton={<ModuleListPageSkeleton />}
      >
        {page.filteredSuppliers.length === 0 ? (
          <EmptyState
            variant="premium"
            title={
              page.statusTab === 'recent'
                ? t('suppliers.empty.recent.title')
                : page.searchQuery.trim()
                  ? t('suppliers.empty.search.title')
                  : t('suppliers.empty.title')
            }
            description={
              page.statusTab === 'recent'
                ? t('suppliers.empty.recent.description')
                : page.searchQuery.trim()
                  ? t('suppliers.empty.search.description')
                  : t('suppliers.empty.description')
            }
            icon={<Truck size={32} />}
          />
        ) : (
          <SuppliersListSection
            suppliers={page.filteredSuppliers}
            onOpen={page.openSupplier}
            highlightedSupplierId={page.highlightedSupplierId}
          />
        )}
      </AsyncBoundary>

      <SupplierDetailSheet
        detail={page.detail}
        loading={page.detailLoading}
        open={page.selectedId != null}
        monitoring={page.monitoringId === page.selectedId}
        onClose={page.closeDetail}
        onSync={() => page.selectedId && void page.monitor(page.selectedId)}
        onAutoSyncChange={(enabled) =>
          page.selectedId && void page.setAutoSync(page.selectedId, enabled)
        }
      />
    </ModulePageLayout>
  );
}
