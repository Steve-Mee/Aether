import React from 'react';
import HomeActivityPreview from '@/components/home/HomeActivityPreview';
import HomeLandingSkeleton from '@/components/home/HomeLandingSkeleton';
import HomeOutcomeMetrics from '@/components/home/HomeOutcomeMetrics';
import HomeQuickActions from '@/components/home/HomeQuickActions';
import HomeTodaySummary from '@/components/home/HomeTodaySummary';
import HomeWelcomeHeader from '@/components/home/HomeWelcomeHeader';
import CommandCenterApprovalSheet from './command-center/CommandCenterApprovalSheet';
import CommandCenterHeroBar from './command-center/CommandCenterHeroBar';
import ProactiveSuggestionsSection from './command-center/ProactiveSuggestionsSection';
import GoalsHomeWidget from './goals/GoalsHomeWidget';
import TodayReadySection from './command-center/TodayReadySection';
import { useCommandCenterShell } from '@/features/command-center/hooks/useCommandCenterShell';

export default function CommandCenterShell() {
  const {
    loading,
    homeViewModel,
    activityItems,
    activitySource,
    highRiskPendingCount,
    tenantDisplayName,
    activeIntent,
    executedIntent,
    executedInsightId,
    insights,
    approvalTarget,
    autoExecuteTrigger,
    approvalConfirmedIntentId,
    adjustCommandRef,
    highlightInsightId,
    highlightGeneration,
    highlightPulse,
    demo,
    showTodayReady,
    handleProactiveSelect,
    handleIntentChange,
    handleIntentClear,
    handleCommandUndo,
    handleExecute,
    handleInsightActivate,
    handleInsightExecute,
    handleSyncSuppliers,
    handleApprovalConfirm,
    handleApprovalAdjust,
    handleApprovalReject,
  } = useCommandCenterShell();

  if (loading) {
    return <HomeLandingSkeleton />;
  }

  return (
    <div
      className="w-full max-w-5xl pt-1 sm:pt-2 motion-safe:animate-fade-in"
      data-testid="command-center-ready"
      data-active-intent={activeIntent ?? undefined}
      data-executed-intent={executedIntent ?? undefined}
      data-executed-insight={executedInsightId ?? undefined}
    >
      <div className="space-y-8 sm:space-y-10">
        <HomeWelcomeHeader tenantDisplayName={tenantDisplayName} />

        <HomeOutcomeMetrics viewModel={homeViewModel} />

        <HomeTodaySummary viewModel={homeViewModel} />

        <GoalsHomeWidget />

        <ProactiveSuggestionsSection onSelect={handleProactiveSelect} />

        <div className="space-y-4">
          <CommandCenterHeroBar
            demo={demo}
            todayReadyInsights={insights}
            onIntentChange={handleIntentChange}
            onIntentClear={handleIntentClear}
            onUndo={handleCommandUndo}
            autoExecuteTrigger={autoExecuteTrigger}
            onAutoExecuteComplete={handleExecute}
            approvalConfirmedIntentId={approvalConfirmedIntentId}
            adjustCommandRef={adjustCommandRef}
          />
          <HomeQuickActions
            highRiskPendingCount={highRiskPendingCount}
            onSyncSuppliers={handleSyncSuppliers}
          />
        </div>

        {showTodayReady && (
          <TodayReadySection
            insights={insights}
            highlightId={highlightInsightId}
            highlightGeneration={highlightGeneration}
            highlightPulse={highlightPulse}
            onActivate={handleInsightActivate}
            onExecute={handleInsightExecute}
          />
        )}

        <HomeActivityPreview items={activityItems} feedSource={activitySource} />
      </div>

      <CommandCenterApprovalSheet
        open={!!approvalTarget}
        response={approvalTarget}
        onConfirm={handleApprovalConfirm}
        onAdjust={handleApprovalAdjust}
        onReject={handleApprovalReject}
      />
    </div>
  );
}
