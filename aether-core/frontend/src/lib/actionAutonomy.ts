import type { CommandResult } from './CommandContext';

export type ActionExecutionMode = 'autonomous' | 'approval_required' | 'inform_only';

export interface ActionAutonomyInput {
  requiresApproval?: boolean;
  riskBand?: 'low' | 'medium' | 'high';
}

export function resolveExecutionMode(input: ActionAutonomyInput): ActionExecutionMode {
  if (input.requiresApproval === true || input.riskBand === 'high') {
    return 'approval_required';
  }
  if (input.riskBand === 'medium') {
    return 'inform_only';
  }
  return 'autonomous';
}

export function resolveExecutionModeFromResult(result: CommandResult): ActionExecutionMode {
  return resolveExecutionMode({
    requiresApproval: result.requiresApproval,
    riskBand: result.riskBand,
  });
}

export function autonomyLabel(mode: ActionExecutionMode): string {
  switch (mode) {
    case 'autonomous':
      return 'Autonoom mogelijk';
    case 'approval_required':
      return 'Goedkeuring vereist';
    case 'inform_only':
      return 'Ter informatie';
  }
}

export function autonomyAccentClass(mode: ActionExecutionMode): string {
  switch (mode) {
    case 'autonomous':
      return 'border-success/25';
    case 'approval_required':
      return 'border-warning/25';
    case 'inform_only':
      return 'border-border/25';
  }
}

export function defaultExecuteLabel(mode: ActionExecutionMode): string {
  switch (mode) {
    case 'autonomous':
      return 'Automatisch uitvoeren';
    case 'approval_required':
      return 'Goedkeuring nodig';
    case 'inform_only':
      return 'Bekijken';
  }
}
