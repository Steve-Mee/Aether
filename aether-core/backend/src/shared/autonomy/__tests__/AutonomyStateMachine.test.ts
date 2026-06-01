import { autonomyStateMachine, mapProposalStatusToStage } from '../AutonomyStateMachine';

describe('AutonomyStateMachine', () => {
  it('advances through staged rollout to live', () => {
    let stage = mapProposalStatusToStage('proposed');
    stage = autonomyStateMachine.nextStage(stage, 'checks_passed');
    expect(stage).toBe('static_checks');
    stage = autonomyStateMachine.nextStage(stage, 'sandbox_passed');
    expect(stage).toBe('sandbox');
    stage = autonomyStateMachine.nextStage(stage, 'approved');
    expect(stage).toBe('human_gate');
    stage = autonomyStateMachine.nextStage(stage, 'rollout_complete');
    expect(stage).toBe('staged_rollout');
    stage = autonomyStateMachine.nextStage(stage, 'rollout_complete');
    expect(stage).toBe('live');
  });

  it('blocks invalid transitions', () => {
    expect(autonomyStateMachine.canTransition('proposed', 'live')).toBe(false);
    expect(autonomyStateMachine.canTransition('staged_rollout', 'live')).toBe(true);
  });
});
