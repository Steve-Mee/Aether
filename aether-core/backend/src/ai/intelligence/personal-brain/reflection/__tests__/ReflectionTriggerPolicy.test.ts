import {
  getReflectionMinTools,
  isExperienceReflectionEnabled,
  resolveTrigger,
  shouldReflect,
} from '../ReflectionTriggerPolicy';
import type { ReflectionTriggerContext } from '../types';

describe('ReflectionTriggerPolicy', () => {
  const base: ReflectionTriggerContext = {
    intent: 'UNKNOWN',
    goalReached: true,
    toolsUsed: 0,
    usedAgentLoop: false,
  };

  beforeEach(() => {
    delete process.env.PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED;
    delete process.env.PERSONAL_BRAIN_MEMORY_REFLECTION_ENABLED;
    delete process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_MULTI_STEP;
    delete process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_HIGH_IMPACT;
    delete process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_FAILURE;
    delete process.env.PERSONAL_BRAIN_REFLECTION_MIN_TOOLS;
  });

  it('is enabled by default', () => {
    expect(isExperienceReflectionEnabled()).toBe(true);
  });

  it('respects master disable flag', () => {
    process.env.PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED = 'false';
    expect(shouldReflect({ ...base, intent: 'PRICE_UPDATE', toolsUsed: 3, usedAgentLoop: true })).toBe(
      false
    );
  });

  it('triggers on multi-step agent loop', () => {
    expect(
      resolveTrigger({
        ...base,
        usedAgentLoop: true,
        toolsUsed: getReflectionMinTools(),
        goalReached: true,
      })
    ).toBe('multi_step');
  });

  it('triggers on high-impact intent with activity', () => {
    expect(
      resolveTrigger({
        ...base,
        intent: 'PRICE_UPDATE',
        goalReached: true,
        toolsUsed: 1,
        usedAgentLoop: true,
      })
    ).toBe('high_impact');
  });

  it('skips single-shot low-impact commands', () => {
    expect(
      resolveTrigger({
        ...base,
        intent: 'HELP',
        goalReached: true,
        toolsUsed: 0,
        usedAgentLoop: false,
      })
    ).toBeNull();
  });

  it('skips when checkpoint pending', () => {
    expect(
      resolveTrigger({
        ...base,
        intent: 'PRICE_UPDATE',
        toolsUsed: 3,
        usedAgentLoop: true,
        checkpoint: true,
      })
    ).toBeNull();
  });

  it('triggers failure mode when enabled', () => {
    expect(
      resolveTrigger({
        ...base,
        intent: 'PRICE_UPDATE',
        goalReached: false,
        toolsUsed: 1,
        usedAgentLoop: true,
      })
    ).toBe('failure');
  });

  it('can opt out of failure mode', () => {
    process.env.PERSONAL_BRAIN_REFLECTION_TRIGGER_FAILURE = 'false';
    expect(
      resolveTrigger({
        ...base,
        intent: 'UNKNOWN',
        goalReached: false,
        toolsUsed: 1,
        usedAgentLoop: false,
      })
    ).toBeNull();
  });
});
