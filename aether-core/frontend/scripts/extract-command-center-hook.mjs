import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shellPath = path.join(__dirname, '../src/components/CommandCenterShell.tsx');
const hookPath = path.join(__dirname, '../src/features/command-center/hooks/useCommandCenterShell.ts');
const lines = fs.readFileSync(shellPath, 'utf8').split('\n');

const imports = `import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyMerchantAutonomy } from '@/lib/settings/applyMerchantAutonomy';
import { useDashboard } from '@/lib/DashboardContext';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { DemoCommandResponse, DemoIntentId, LinkedInsightId } from '@/lib/localIntentMatcher';
import { intentToLinkedInsight } from '@/lib/localIntentMatcher';
import {
  applyCommandComplete,
  applyExecute,
  applyUndoRevert,
  clearJustAppeared,
  finalizeExiting,
  getInitialTodayReadyInsightsForHome,
  insightIdToDemoCommand,
  visibleInsightIds,
  renderableInsights,
  type TodayReadyInsight,
  type TodayReadyInsightId,
} from '@/lib/todayReady';
import {
  APPROVALS_CLEARED_EVENT,
  APPROVALS_CHANGED_EVENT,
  type ApprovalsChangedDetail,
} from '@/lib/approvalsCommandCenterSync';
import { subscribeInsightAppeared } from '@/lib/aetherLiveBus';
import { useCommandDemoFlow } from '@/hooks/useCommandDemoFlow';
import { trackBusinessEvent } from '@/lib/observability/businessEvents';
import { useHomeLanding } from '@/features/command-center/hooks/useHomeLanding';

const HIGHLIGHT_AUTO_CLEAR_MS = 5000;
const HIGHLIGHT_SEQUENCE_DELAY_MS = 300;
const EXIT_ANIMATION_MS = 350;
const AUTO_EXECUTE_AFTER_MS = 150;

export function useCommandCenterShell() {
`;

// Original file: logic from line 48 (useDashboard inside function) - we skip 47-57 and take 58-393 (0-indexed: 57-392)
const bodyLines = lines.slice(57, 393);
const hook = imports + bodyLines.join('\n') + `
  return {
    loading: settingsLoading || homeLoading,
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
  };
}
`;

fs.writeFileSync(hookPath, hook);
console.log('hook lines:', hook.split('\n').length);
