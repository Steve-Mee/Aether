import { ReflectionHandoffService } from '../ReflectionHandoffService';
import { ExperienceReflectionService } from '../ExperienceReflectionService';
import { LongTermMemoryStore } from '../../memory/LongTermMemoryStore';
import { createInMemoryIntelligenceLayer } from '../../../createIntelligenceLayer';

describe('ReflectionHandoffService', () => {
  it('handoffs mail reflections to admin semantic memory without raw command', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const longTerm = new LongTermMemoryStore(layer.personalBrainRegistry);
    const reflectionService = new ExperienceReflectionService(longTerm, {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          goal: 'Beantwoord mail',
          stepsTaken: ['classify'],
          outcome: 'ok',
          wentWell: ['snel'],
          couldImprove: [],
          futureLearnings: ['Check spam filter eerst'],
        })
      ),
    });
    const handoff = new ReflectionHandoffService(longTerm);

    await reflectionService.reflectAndStore({
      tenantId: 'tenant_handoff',
      command: 'Beantwoord klant email over order #12345',
      intent: 'MAIL_REPLY',
      agentKey: 'mail',
      summary: {
        goalReached: true,
        completedSteps: [{ label: 'reply', tool: 'send_mail' }],
        failedSteps: [],
        pendingApprovals: 0,
        narrative: 'Mail verstuurd',
      },
      trigger: 'high_impact',
    });

    const result = await handoff.handoffToAdmin('tenant_handoff', 'mail');
    expect(result.handoffCount).toBe(1);

    const adminSemantic = await longTerm.recallSemantic('tenant_handoff', 'spam filter', 5, 'admin');
    expect(adminSemantic.some((s) => s.summary.includes('[mail]'))).toBe(true);
    expect(adminSemantic.some((s) => s.summary.includes('order #12345'))).toBe(false);
  });
});
