import { EmailPolicyService } from '../application/services/EmailPolicyService';

describe('EmailPolicyService', () => {
  const service = new EmailPolicyService();

  it('allows auto-reply for whitelisted high-confidence categories', () => {
    expect(service.canAutoReply('order_status', 0.9)).toBe(true);
    expect(service.canAutoReply('complaint', 0.95)).toBe(false);
    expect(service.canAutoReply('order_status', 0.5)).toBe(false);
  });

  it('builds policy-safe replies without PII', () => {
    const reply = service.buildAutoReply('tracking_request');
    expect(reply).toContain('tracking');
    expect(reply.length).toBeLessThanOrEqual(500);
    expect(reply).not.toMatch(/@\w+\.\w+/);
  });
});
