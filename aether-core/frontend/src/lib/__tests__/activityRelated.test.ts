import { describe, it, expect } from 'vitest';
import { canExplainApproval, isLiveRelatedId } from '../activityRelated';

describe('activityRelated', () => {
  it('isLiveRelatedId rejects demo prefixes', () => {
    expect(isLiveRelatedId('demo-approval-1')).toBe(false);
    expect(isLiveRelatedId('clxyz123')).toBe(true);
  });

  it('canExplainApproval only for live approval ids', () => {
    expect(canExplainApproval({ type: 'approval', id: 'demo-approval-1' })).toBe(false);
    expect(canExplainApproval({ type: 'approval', id: 'ap_live_1' })).toBe(true);
    expect(canExplainApproval({ type: 'insight', id: 'x' })).toBe(false);
  });
});
