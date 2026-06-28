import type { CommandResult } from '@/types/command';
import { FIXTURE_TIMESTAMP } from '../fixtures';

let commandSeq = 0;

export function buildCommandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  commandSeq += 1;
  const id = overrides.commandId ?? `test-cmd-${commandSeq}`;
  return {
    success: true,
    originalCommand: 'test command',
    result: 'Test uitgevoerd',
    parsedIntent: 'test.intent',
    action: 'test_action',
    confidence: 0.95,
    timestamp: FIXTURE_TIMESTAMP,
    commandId: id,
    undoable: true,
    undoExpiresAt: '2026-06-04T12:00:00.000Z',
    ...overrides,
  };
}

export function buildFailedCommandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  return buildCommandResult({
    success: false,
    parsedIntent: 'ERROR',
    result: 'Commando mislukt',
    undoable: false,
    ...overrides,
  });
}

export function resetCommandFactorySeq(): void {
  commandSeq = 0;
}
