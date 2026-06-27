import { describe, it, expect } from 'vitest';
import type { AgentStreamEvent } from '@/types/command';
import { eventToStep } from '@/lib/useCommandStream';

describe('eventToStep', () => {
  it('maps plan_ready to null (handled separately)', () => {
    expect(
      eventToStep(
        { type: 'plan_ready', goal: 'Test', steps: [{ index: 1, label: 'Stap 1' }], timestamp: '' },
        0
      )
    ).toBeNull();
  });

  it('maps step_progress to plan step', () => {
    const step = eventToStep(
      {
        type: 'step_progress',
        planStep: 1,
        planStepTotal: 3,
        stepStatus: 'running',
        steps: [{ index: 1, label: 'Haal data op' }],
        timestamp: '',
      },
      1
    );
    expect(step?.label).toContain('Haal data op');
    expect(step?.done).toBe(false);
  });

  it('maps checkpoint with checkpoint flag', () => {
    const step = eventToStep(
      { type: 'checkpoint', summary: 'Wacht op goedkeuring', proposalId: 'p1', timestamp: '' },
      2
    );
    expect(step?.checkpoint).toBe(true);
  });

  it('maps reflection to evaluation step', () => {
    const step = eventToStep(
      {
        type: 'reflection',
        observation: 'Genoeg productdata gevonden.',
        nextAction: 'continue',
        timestamp: '',
      },
      3
    );
    expect(step?.done).toBe(true);
    expect(step?.summary).toContain('Genoeg productdata');
  });

  it('maps plan_revised to revised plan step', () => {
    const step = eventToStep(
      {
        type: 'plan_revised',
        goal: 'Herzien plan',
        revision: 2,
        timestamp: '',
      },
      4
    );
    expect(step?.summary).toBe('Herzien plan');
    expect(step?.done).toBe(false);
  });
});
