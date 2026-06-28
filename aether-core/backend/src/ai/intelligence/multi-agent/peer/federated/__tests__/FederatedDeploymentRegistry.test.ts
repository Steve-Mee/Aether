import {
  hashQueryHint,
  signFederatedPayload,
  verifyFederatedSignature,
} from '../FederatedDeploymentRegistry';

describe('FederatedDeploymentRegistry crypto', () => {
  const secret = 'test-secret';

  it('hashes query hints', () => {
    const hash = hashQueryHint('secret query');
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('secret');
  });

  it('signs and verifies payloads', () => {
    const payload = { requestId: 'r1', capability: 'inventory-trends' };
    const signature = signFederatedPayload(payload, secret);
    expect(verifyFederatedSignature(payload, signature, secret)).toBe(true);
    expect(verifyFederatedSignature(payload, 'bad', secret)).toBe(false);
  });
});
