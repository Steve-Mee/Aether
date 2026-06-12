import { SuggestionService } from '../SuggestionService';

jest.mock('../../../../../shared/approval/approvalService', () => ({
  countPendingApprovals: jest.fn().mockResolvedValue(2),
}));

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    product: { count: jest.fn().mockResolvedValue(5) },
    emailMessage: { count: jest.fn().mockResolvedValue(1) },
  },
}));

describe('SuggestionService', () => {
  const service = new SuggestionService();

  it('returns nowRelevant when pending approvals exist', async () => {
    const result = await service.getSuggestions('tenant-1', '/approvals', 12);
    expect(result.nowRelevant.length).toBeGreaterThan(0);
    expect(result.nowRelevant[0]?.intentId).toBe('HIGH_RISK_APPROVALS');
  });

  it('includes static suggestions in groups', async () => {
    const result = await service.getSuggestions('tenant-1', '/', 12);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it('identifies undoable intents', () => {
    expect(SuggestionService.isUndoableIntent('PRICE_UPDATE')).toBe(true);
    expect(SuggestionService.isUndoableIntent('UNKNOWN')).toBe(false);
  });
});
