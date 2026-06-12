import type { DataAdapter } from '@/lib/data/adapters/DataAdapter';
import { mockDataAdapter } from '@/lib/data/adapters/mockAdapter';
import type { ApprovalItem } from '@/types/approval';
import type { CommandResult } from '@/types/command';
import { buildCommandResult } from './factories/command';
import { buildHighRiskApproval, buildLowRiskApproval } from './factories/approval';

export interface TestAdapterOptions {
  approvals?: ApprovalItem[];
  executeCommand?: (command: string) => Promise<CommandResult>;
  resolveFails?: boolean;
  executeFails?: boolean;
}

export function createTestDataAdapter(options: TestAdapterOptions = {}): DataAdapter {
  let approvals = options.approvals ?? [buildHighRiskApproval(), buildLowRiskApproval()];
  let commandSeq = 0;

  const defaultExecute = async (command: string): Promise<CommandResult> => {
    if (options.executeFails) {
      throw new Error('Command execution failed');
    }
    commandSeq += 1;
    return buildCommandResult({
      originalCommand: command.trim(),
      result: `Uitgevoerd: ${command.trim()}`,
      parsedIntent: 'APPROVE_CHANGES',
      commandId: `test-cmd-${commandSeq}`,
      undoable: true,
    });
  };

  return {
    ...mockDataAdapter,
    fetchActivity: async () => ({ items: [], source: 'live' as const }),
    fetchApprovals: async () => [...approvals],
    resolveApproval: async (id) => {
      if (options.resolveFails) {
        throw new Error('Resolve failed');
      }
      approvals = approvals.filter((a) => a.id !== id);
      return { success: true };
    },
    executeCommand: options.executeCommand ?? defaultExecute,
    undoCommand: async (commandId) => ({
      success: true,
      commandId,
      message: 'Undone',
      intent: 'test.intent',
    }),
    fetchCommandHistory: async () => [],
    autoApplyApprovals: async () => {
      const lowRisk = approvals.filter((a) => !a.actionType.includes('refund'));
      const applied = lowRisk.length;
      const skipped = approvals.length - applied;
      approvals = approvals.filter((a) => a.actionType.includes('refund'));
      return { applied, skipped, skippedIds: [] };
    },
  };
}
