import React from 'react';
import { CheckCircle2, History, Search } from 'lucide-react';
import { AsyncBoundary, ApprovalsPageSkeleton, EmptyState } from '@/components/ui';
import ApprovalPageHeader from '@/components/approvals/ApprovalPageHeader';
import ApprovalToolbar from '@/components/approvals/ApprovalToolbar';
import ApprovalBulkBar from '@/components/approvals/ApprovalBulkBar';
import ApprovalListSection from '@/components/approvals/ApprovalListSection';
import ApprovalRecentList from '@/components/approvals/ApprovalRecentList';
import ApprovalSuccessBanner from '@/components/approvals/ApprovalSuccessBanner';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { useApprovalsPage } from '@/features/approvals';
import { usePermission } from '@/lib/auth/usePermission';
import { t } from '@/lib/i18n';

export default function Approvals() {
  const page = useApprovalsPage();
  const canApproveHighRisk = usePermission('approvals.approveHighRisk');
  const lowRiskAutonomous24h =
    page.dashboard?.lowRiskAutonomous24h ??
    (page.dashboard?.autonomousActions7d != null
      ? Math.round(page.dashboard.autonomousActions7d / 7)
      : 0);

  const showBulkBar =
    page.activeTab !== 'recent' &&
    (page.selectedIds.size > 0 ||
      ((page.activeTab === 'low' || page.activeTab === 'all') && page.lowRiskItems.length > 0));

  const showAutoApplyOnBar = page.activeTab === 'low' || page.activeTab === 'all';

  return (
    <ModulePageLayout
      testId="approvals-page"
      maxWidth="4xl"
      header={<ApprovalPageHeader pendingCount={page.pendingCount} dashboard={page.dashboard} />}
      loading={false}
      error={null}
      wrapAsync={false}
    >
      <ApprovalToolbar
        activeTab={page.activeTab}
        onTabChange={page.setActiveTab}
        searchQuery={page.searchQuery}
        onSearchChange={page.setSearchQuery}
        dateFilter={page.dateFilter}
        onDateFilterChange={page.setDateFilter}
      />

      {page.successMessage && (
        <ApprovalSuccessBanner message={page.successMessage} onDismiss={page.clearSuccessMessage} />
      )}

      <AsyncBoundary
        loading={page.loading}
        error={page.error}
        onRetry={page.reload}
        skeleton={<ApprovalsPageSkeleton />}
      >
        {page.activeTab === 'recent' ? (
          <ApprovalRecentList items={page.recentEnriched} />
        ) : page.pendingCount === 0 ? (
          <EmptyState
            variant="premium"
            icon={<CheckCircle2 size={32} strokeWidth={1.5} />}
            title={t('approvals.empty.title')}
            description={t('approvals.empty.description').replace(
              '{count}',
              String(lowRiskAutonomous24h),
            )}
            hint={t('approvals.stat.autonomous').replace(
              '{count}',
              String(page.dashboard?.autonomousActions7d ?? 0),
            )}
          />
        ) : page.filteredPending.length === 0 ? (
          <EmptyState
            variant="premium"
            icon={<Search size={28} strokeWidth={1.5} />}
            title={t('approvals.empty.filtered')}
            description={t('approvals.empty.filteredDesc')}
            actionLabel={t('approvals.empty.clearFilters')}
            onAction={page.clearFilters}
          />
        ) : (
          <>
            {showBulkBar && (
              <ApprovalBulkBar
                selectedCount={page.selectedIds.size}
                lowRiskCount={page.lowRiskItems.length}
                bulkLoading={page.bulkLoading}
                onSelectAllLow={page.selectAllLowRisk}
                onApproveSelected={() => page.resolveMany([...page.selectedIds])}
                onAutoApplyAll={page.runAutoApply}
                onClear={page.clearSelection}
                showAutoApply={showAutoApplyOnBar && page.lowRiskItems.length > 0}
              />
            )}

            {page.showGroupedSections ? (
              <div className="space-y-8">
                <ApprovalListSection
                  title={t('approvals.section.high')}
                  items={page.highRiskItems}
                  highRiskZone
                  allowHighRiskActions={canApproveHighRisk}
                  selectedIds={page.selectedIds}
                  onToggleSelect={page.toggleSelect}
                  showCheckboxes={false}
                  resolvingId={page.resolvingId}
                  onApprove={(id) => page.resolveOne(id, true)}
                  onReject={(id) => page.resolveOne(id, false)}
                />
                <ApprovalListSection
                  title={t('approvals.section.other')}
                  items={page.otherItems}
                  selectedIds={page.selectedIds}
                  onToggleSelect={page.toggleSelect}
                  showCheckboxes
                  resolvingId={page.resolvingId}
                  onApprove={(id) => page.resolveOne(id, true)}
                  onReject={(id) => page.resolveOne(id, false)}
                />
              </div>
            ) : (
              <ApprovalListSection
                items={page.filteredPending}
                highRiskZone={page.activeTab === 'high'}
                allowHighRiskActions={canApproveHighRisk}
                selectedIds={page.selectedIds}
                onToggleSelect={page.toggleSelect}
                showCheckboxes={page.activeTab === 'low' || page.activeTab === 'all'}
                resolvingId={page.resolvingId}
                onApprove={(id) => page.resolveOne(id, true)}
                onReject={(id) => page.resolveOne(id, false)}
              />
            )}
          </>
        )}
      </AsyncBoundary>
    </ModulePageLayout>
  );
}
