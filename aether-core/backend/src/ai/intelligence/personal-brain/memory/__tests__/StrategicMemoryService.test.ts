import type { LongTermMemoryStore } from '../LongTermMemoryStore';
import { StrategicMemoryService } from '../StrategicMemoryService';
import { MEMORY_KIND_PLAN } from '../constants';

describe('StrategicMemoryService', () => {
  let service: StrategicMemoryService;
  let mockLongTerm: jest.Mocked<LongTermMemoryStore>;

  beforeEach(() => {
    mockLongTerm = {
      store: jest.fn().mockResolvedValue('memory-123'),
      recall: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<LongTermMemoryStore>;

    service = new StrategicMemoryService(mockLongTerm);
    process.env.PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED = 'true';
  });

  describe('rememberStrategy', () => {
    it('stores a successful strategy with high priority', async () => {
      const id = await service.rememberStrategy({
        tenantId: 'tenant-1',
        strategy: 'Dynamic pricing based on competitor analysis',
        context: 'Low conversion rate on premium products',
        outcome: 'success',
        impact: 'high',
        patterns: ['price_sensitivity', 'competitor_aware'],
      });

      expect(id).toBe('memory-123');
      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          intent: 'STRATEGY',
          priority: 'high',
          memoryKind: MEMORY_KIND_PLAN,
          lessonLearned: true,
        })
      );
    });

    it('stores a failed strategy with low priority', async () => {
      await service.rememberStrategy({
        tenantId: 'tenant-1',
        strategy: 'Aggressive discount campaign',
        context: 'Boost holiday sales',
        outcome: 'failure',
        impact: 'medium',
      });

      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'low',
          lessonLearned: false,
        })
      );
    });

    it('returns undefined when strategic memory is disabled', async () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED = 'false';
      const id = await service.rememberStrategy({
        tenantId: 'tenant-1',
        strategy: 'Test',
        context: 'Test',
        outcome: 'success',
      });

      expect(id).toBeUndefined();
      expect(mockLongTerm.store).not.toHaveBeenCalled();
    });
  });

  describe('rememberHighImpactAction', () => {
    it('stores high-impact action with metrics', async () => {
      await service.rememberHighImpactAction({
        tenantId: 'tenant-1',
        action: 'Restock bestseller before stockout',
        goal: 'Prevent revenue loss',
        impact: 0.85,
        success: true,
        context: 'Predicted stockout in 2 days',
      });

      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'HIGH_IMPACT',
          priority: 'high',
          memoryKind: MEMORY_KIND_PLAN,
          lessonLearned: true,
          outcomeMetrics: { uplift: 0.85 },
        })
      );
    });

    it('assigns medium priority for moderate impact', async () => {
      await service.rememberHighImpactAction({
        tenantId: 'tenant-1',
        action: 'Minor price adjustment',
        goal: 'Improve margins',
        impact: 0.5,
        success: true,
      });

      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium',
          lessonLearned: false,
        })
      );
    });
  });

  describe('rememberMerchantPattern', () => {
    it('stores merchant behavior pattern', async () => {
      await service.rememberMerchantPattern({
        tenantId: 'tenant-1',
        pattern: 'Prefers manual approval for price changes above 10%',
        category: 'preference',
        confidence: 0.9,
        observations: [
          'Rejected 3 auto-price proposals >10%',
          'Approved 5 proposals <10%',
        ],
      });

      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'MERCHANT_PATTERN',
          priority: 'high',
          memoryKind: MEMORY_KIND_PLAN,
          lessonLearned: true,
        })
      );
    });

    it('assigns low priority for low-confidence patterns', async () => {
      await service.rememberMerchantPattern({
        tenantId: 'tenant-1',
        pattern: 'May prefer email over SMS',
        category: 'preference',
        confidence: 0.4,
        observations: ['Opened 2 emails, ignored 1 SMS'],
      });

      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'low',
          lessonLearned: false,
        })
      );
    });
  });

  describe('recallStrategies', () => {
    it('recalls relevant strategies for context', async () => {
      mockLongTerm.recall = jest.fn().mockResolvedValue([
        {
          id: 'strat-1',
          summary:
            'Strategy: Dynamic pricing | Context: Low conversion | Outcome: success | Goal: Increase sales',
          score: 0.85,
          timestamp: '2026-01-01T10:00:00Z',
        },
      ]);

      const results = await service.recallStrategies('tenant-1', 'Low conversion');

      expect(mockLongTerm.recall).toHaveBeenCalledWith(
        'tenant-1',
        'Strategy: Low conversion',
        3,
        [MEMORY_KIND_PLAN],
        undefined
      );
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'strat-1',
        strategy: 'Strategy: Dynamic pricing',
        score: 0.85,
      });
    });

    it('returns empty array when disabled', async () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED = 'false';
      const results = await service.recallStrategies('tenant-1', 'Test');

      expect(results).toEqual([]);
      expect(mockLongTerm.recall).not.toHaveBeenCalled();
    });
  });

  describe('recallHighImpactActions', () => {
    it('recalls high-impact actions for goal', async () => {
      mockLongTerm.recall = jest.fn().mockResolvedValue([
        {
          id: 'action-1',
          summary:
            'High impact: Restock bestseller | Goal: Prevent loss | Impact: 0.85 | Success: true',
          score: 0.9,
        },
      ]);

      const results = await service.recallHighImpactActions('tenant-1', 'Prevent loss');

      expect(results).toHaveLength(1);
      expect(results[0].strategy).toContain('High impact:');
    });
  });

  describe('recallMerchantPatterns', () => {
    it('recalls merchant patterns by category', async () => {
      mockLongTerm.recall = jest.fn().mockResolvedValue([
        {
          id: 'pattern-1',
          summary:
            'Pattern: Prefers manual approval | Category: preference | Confidence: 0.90',
          score: 0.8,
        },
      ]);

      const results = await service.recallMerchantPatterns('tenant-1', 'preference');

      expect(mockLongTerm.recall).toHaveBeenCalledWith(
        'tenant-1',
        'Pattern: preference',
        5,
        [MEMORY_KIND_PLAN],
        undefined
      );
      expect(results).toHaveLength(1);
    });

    it('recalls all patterns when no category specified', async () => {
      await service.recallMerchantPatterns('tenant-1');

      expect(mockLongTerm.recall).toHaveBeenCalledWith(
        'tenant-1',
        'Pattern:',
        5,
        [MEMORY_KIND_PLAN],
        undefined
      );
    });
  });
});
