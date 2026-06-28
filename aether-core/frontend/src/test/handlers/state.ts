import type { ApprovalItem } from '@/types/approval';
import type { ActivityItem } from '@/types/activity';
import type { CommandResult } from '@/types/command';
import { mockApprovalsPending, mockDashboard, mockActivityFeed } from '../fixtures';
import { buildCommandResult } from '../factories/command';

let approvals: ApprovalItem[] = mockApprovalsPending.map((a) => ({ ...a }));
let activityItems: ActivityItem[] = mockActivityFeed.items as ActivityItem[];
let commandSeq = 0;
let lastCommand: CommandResult | null = null;
let resolveShouldFail = false;
let executeShouldFail = false;

export function resetMswState(): void {
  approvals = mockApprovalsPending.map((a) => ({ ...a }));
  activityItems = mockActivityFeed.items as ActivityItem[];
  commandSeq = 0;
  lastCommand = null;
  resolveShouldFail = false;
  executeShouldFail = false;
}

export function setMswResolveFails(fail: boolean): void {
  resolveShouldFail = fail;
}

export function setMswExecuteFails(fail: boolean): void {
  executeShouldFail = fail;
}

export function getMswApprovals(): ApprovalItem[] {
  return approvals;
}

export function getMswLastCommand(): CommandResult | null {
  return lastCommand;
}

export function mswExecuteCommand(command: string): CommandResult {
  if (executeShouldFail) {
    throw new Error('MSW command failed');
  }
  commandSeq += 1;
  lastCommand = buildCommandResult({
    originalCommand: command.trim(),
    result: `MSW: ${command.trim()}`,
    parsedIntent: 'APPROVE_CHANGES',
    commandId: `msw-cmd-${commandSeq}`,
    undoable: true,
  });
  return lastCommand;
}

export function mswResolveApproval(id: string): void {
  if (resolveShouldFail) {
    throw new Error('MSW resolve failed');
  }
  approvals = approvals.filter((a) => a.id !== id);
}

export function mswUndoCommand(commandId: string) {
  return {
    success: true,
    commandId,
    message: 'MSW undo',
    intent: 'test.intent',
  };
}

export function getMswActivityFeed() {
  return { items: activityItems, source: 'live' as const };
}

export function appendMswActivityItem(item: ActivityItem): void {
  activityItems = [item, ...activityItems].slice(0, 50);
}

export { mockDashboard, mockActivityFeed };
