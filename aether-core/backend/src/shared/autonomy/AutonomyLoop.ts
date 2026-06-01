/**
 * Canonical autonomy stages for Observe → Decide → Approve → Execute → Measure → Learn.
 * P3: wire module use-cases through this loop instead of ad-hoc approval paths.
 */
export type AutonomyLoopStage =
  | 'observe'
  | 'decide'
  | 'approve'
  | 'execute'
  | 'measure'
  | 'learn';

export interface AutonomyLoopTransition {
  from: AutonomyLoopStage;
  to: AutonomyLoopStage;
  module: string;
  action: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export class AutonomyLoop {
  static nextAfterDecision(requiresApproval: boolean): AutonomyLoopStage {
    return requiresApproval ? 'approve' : 'execute';
  }

  static stages(): AutonomyLoopStage[] {
    return ['observe', 'decide', 'approve', 'execute', 'measure', 'learn'];
  }
}
