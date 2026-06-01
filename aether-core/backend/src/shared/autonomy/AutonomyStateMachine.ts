export type AutonomyStage =
  | 'proposed'
  | 'static_checks'
  | 'sandbox'
  | 'human_gate'
  | 'staged_rollout'
  | 'live'
  | 'rolled_back';

const TRANSITIONS: Record<AutonomyStage, AutonomyStage[]> = {
  proposed: ['static_checks', 'rolled_back'],
  static_checks: ['sandbox', 'rolled_back'],
  sandbox: ['human_gate', 'rolled_back'],
  human_gate: ['staged_rollout', 'rolled_back'],
  staged_rollout: ['live', 'rolled_back'],
  live: ['rolled_back'],
  rolled_back: [],
};

export class AutonomyStateMachine {
  canTransition(from: AutonomyStage, to: AutonomyStage): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  nextStage(current: AutonomyStage, event: 'checks_passed' | 'sandbox_passed' | 'approved' | 'rollout_complete' | 'rollback'): AutonomyStage {
    switch (current) {
      case 'proposed':
        return event === 'checks_passed' ? 'static_checks' : current;
      case 'static_checks':
        return event === 'sandbox_passed' ? 'sandbox' : event === 'rollback' ? 'rolled_back' : current;
      case 'sandbox':
        return event === 'approved' ? 'human_gate' : event === 'rollback' ? 'rolled_back' : current;
      case 'human_gate':
        return event === 'rollout_complete' ? 'staged_rollout' : event === 'rollback' ? 'rolled_back' : current;
      case 'staged_rollout':
        return event === 'rollout_complete' ? 'live' : event === 'rollback' ? 'rolled_back' : current;
      default:
        return current;
    }
  }
}

export const autonomyStateMachine = new AutonomyStateMachine();

export function mapProposalStatusToStage(status: string): AutonomyStage {
  const map: Record<string, AutonomyStage> = {
    proposed: 'proposed',
    static_checks: 'static_checks',
    sandbox: 'sandbox',
    pending_approval: 'human_gate',
    staged: 'staged_rollout',
    applied: 'live',
    rolled_back: 'rolled_back',
  };
  return map[status] ?? 'proposed';
}
