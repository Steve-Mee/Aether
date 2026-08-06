import type { LongTermMemoryStore } from '../../memory/LongTermMemoryStore';
import type { StrategicMemoryService } from '../../memory/StrategicMemoryService';
import {
  StrategicReflectionService,
  isStrategicReflectionEnabled,
  getStrategicReflectionPeriodDays,
} from '../StrategicReflectionService';
import type { LlmInferencePort } from '../../../../../shared/ai/LlmInferencePort';

describe('StrategicReflectionService', () => {
  let service: StrategicReflectionService;
  let mockLongTerm: jest.Mocked<LongTermMemoryStore>;
  let mockStrategicMemory: jest.Mocked<StrategicMemoryService>;
  let mockLlm: jest.Mocked<LlmInferencePort>;

  beforeEach(() => {
    mockLongTerm = {
      store: jest.fn().mockResolvedValue('reflection-123'),
      listReflections: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<LongTermMemoryStore>;

    mockStrategicMemory = {
      recallStrategies: jest.fn().mockResolvedValue([]),
      rememberStrategy: jest.fn().mockResolvedValue('strategy-456'),
    } as unknown as jest.Mocked<StrategicMemoryService>;

    mockLlm = {
      generate: jest.fn().mockResolvedValue(JSON.stringify({
        goalProgress: [
          {
            goal: 'Improve conversion rate',
            status: 'on_track',
            progress: 0.7,
            keyActions: ['Optimize pricing', 'Add urgency signals'],
          },
        ],
        strategyAdaptations: [
          {
            currentStrategy: 'Static pricing',
            proposedAdaptation: 'Dynamic pricing with competitor monitoring',
            reason: 'Market conditions changed',
            impact: 'high',
            confidence: 0.8,
          },
        ],
        insightsSummary: 'Strong progress on conversion, pricing strategy needs adaptation',
      })),
    } as unknown as jest.Mocked<LlmInferencePort>;

    service = new StrategicReflectionService(mockLongTerm, mockStrategicMemory, mockLlm);
    process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED = 'true';
  });

  describe('isStrategicReflectionEnabled', () => {
    it('returns true when enabled', () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED = 'true';
      expect(isStrategicReflectionEnabled()).toBe(true);
    });

    it('returns true by default', () => {
      delete process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED;
      expect(isStrategicReflectionEnabled()).toBe(true);
    });

    it('returns false when explicitly disabled', () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED = 'false';
      expect(isStrategicReflectionEnabled()).toBe(false);
    });
  });

  describe('getStrategicReflectionPeriodDays', () => {
    it('returns configured period', () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_PERIOD_DAYS = '14';
      expect(getStrategicReflectionPeriodDays()).toBe(14);
    });

    it('returns default 7 days', () => {
      delete process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_PERIOD_DAYS;
      expect(getStrategicReflectionPeriodDays()).toBe(7);
    });
  });

  describe('shouldRunStrategicReflection', () => {
    it('returns true when no previous reflection exists', async () => {
      const should = await service.shouldRunStrategicReflection('tenant-1');
      expect(should).toBe(true);
    });

    it('returns true when period has elapsed', async () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      mockLongTerm.listReflections = jest.fn().mockResolvedValue([
        {
          summary: 'Strategic reflection: old',
          timestamp: oldDate,
        },
      ]);

      const should = await service.shouldRunStrategicReflection('tenant-1');
      expect(should).toBe(true);
    });

    it('returns false when period has not elapsed', async () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      mockLongTerm.listReflections = jest.fn().mockResolvedValue([
        {
          summary: 'Strategic reflection: recent',
          timestamp: recentDate,
        },
      ]);

      const should = await service.shouldRunStrategicReflection('tenant-1');
      expect(should).toBe(false);
    });

    it('returns false when disabled', async () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED = 'false';
      const should = await service.shouldRunStrategicReflection('tenant-1');
      expect(should).toBe(false);
    });
  });

  describe('reflect', () => {
    it('generates strategic reflection with LLM', async () => {
      mockStrategicMemory.recallStrategies = jest.fn().mockResolvedValue([
        {
          strategy: 'Dynamic pricing',
          context: 'Competitive market',
          outcome: 'success',
          score: 0.9,
        },
      ]);

      mockLongTerm.listReflections = jest.fn().mockResolvedValue([
        {
          summary: 'Improved conversion by 15%',
          timestamp: new Date().toISOString(),
        },
      ]);

      const reflection = await service.reflect({
        tenantId: 'tenant-1',
        periodDays: 7,
        activeGoals: [
          {
            id: 'goal-1',
            title: 'Improve conversion rate',
            progressPct: 70,
            targetValue: 100,
            status: 'active',
            metricType: 'revenue',
          },
        ],
      });

      expect(reflection).toBeTruthy();
      expect(reflection?.goalProgress).toHaveLength(1);
      expect(reflection?.goalProgress[0].goal).toBe('Improve conversion rate');
      expect(reflection?.strategyAdaptations).toHaveLength(1);
      expect(reflection?.strategyAdaptations[0].impact).toBe('high');
      expect(mockLlm.generate).toHaveBeenCalled();
    });

    it('returns minimal reflection when no context available', async () => {
      const reflection = await service.reflect({
        tenantId: 'tenant-1',
        periodDays: 7,
      });

      expect(reflection).toBeTruthy();
      expect(reflection?.goalProgress).toEqual([]);
      expect(reflection?.insightsSummary).toContain('Geen recente data');
    });

    it('returns fallback reflection on LLM error', async () => {
      mockLlm.generate = jest.fn().mockRejectedValue(new Error('LLM error'));
      mockStrategicMemory.recallStrategies = jest.fn().mockResolvedValue([
        { strategy: 'Test', context: 'Test', outcome: 'success', score: 0.8 },
      ]);

      const reflection = await service.reflect({
        tenantId: 'tenant-1',
        periodDays: 7,
        activeGoals: [
          {
            id: 'goal-1',
            title: 'Improve conversion rate',
            progressPct: 50,
            targetValue: 100,
            status: 'active',
            metricType: 'revenue',
          },
        ],
      });

      expect(reflection).toBeTruthy();
      expect(reflection?.goalProgress).toHaveLength(1);
      expect(reflection?.goalProgress[0].status).toBe('on_track');
    });

    it('returns null when disabled', async () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED = 'false';
      const reflection = await service.reflect({
        tenantId: 'tenant-1',
      });

      expect(reflection).toBeNull();
    });
  });

  describe('reflectAndStore', () => {
    it('stores strategic reflection and strategy adaptations', async () => {
      mockStrategicMemory.recallStrategies = jest.fn().mockResolvedValue([
        { strategy: 'Pricing', context: 'Test', outcome: 'success', score: 0.9 },
      ]);

      const result = await service.reflectAndStore({
        tenantId: 'tenant-1',
        periodDays: 7,
        activeGoals: [
          {
            id: 'goal-1',
            title: 'Improve conversion rate',
            progressPct: 70,
            targetValue: 100,
            status: 'active',
            metricType: 'revenue',
          },
        ],
      });

      expect(result).toBeTruthy();
      expect(result?.memoryIds).toContain('reflection-123');
      expect(result?.memoryIds).toContain('strategy-456');
      expect(mockLongTerm.store).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'STRATEGIC_REFLECTION',
          priority: 'high',
          lessonLearned: true,
        })
      );
      expect(mockStrategicMemory.rememberStrategy).toHaveBeenCalled();
    });

    it('skips store when no goals and no context', async () => {
      const result = await service.reflectAndStore({
        tenantId: 'tenant-1',
        periodDays: 7,
        activeGoals: [],
      });

      expect(result).toBeNull();
      expect(mockLongTerm.store).not.toHaveBeenCalled();
    });

    it('returns null when disabled', async () => {
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_ENABLED = 'false';
      const result = await service.reflectAndStore({
        tenantId: 'tenant-1',
      });

      expect(result).toBeNull();
    });
  });
});
