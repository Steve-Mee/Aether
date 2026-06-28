import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { ProactiveFinding } from './ProactiveTriggerDefinition';
import type { ProactiveTriggerRegistry } from './ProactiveTriggerRegistry';

export class ProactiveEvaluator {
  constructor(private registry: ProactiveTriggerRegistry) {}

  async evaluatePeriodic(
    tenantId: string,
    adminData: AdminDataPort
  ): Promise<ProactiveFinding[]> {
    const triggers = this.registry.listPeriodic();
    const findings: ProactiveFinding[] = [];
    for (const trigger of triggers) {
      const result = await trigger.evaluate({ tenantId, adminData });
      findings.push(...result);
    }
    return findings;
  }

  async evaluateEvent(
    tenantId: string,
    adminData: AdminDataPort,
    eventType: string,
    eventPayload: Record<string, unknown>
  ): Promise<ProactiveFinding[]> {
    const triggers = this.registry.listForEvent(eventType);
    const findings: ProactiveFinding[] = [];
    for (const trigger of triggers) {
      const result = await trigger.evaluate({ tenantId, adminData, eventPayload });
      findings.push(...result);
    }
    return findings;
  }

  async evaluateTrigger(
    triggerId: string,
    tenantId: string,
    adminData: AdminDataPort,
    eventPayload?: Record<string, unknown>
  ): Promise<ProactiveFinding[]> {
    const trigger = this.registry.get(triggerId);
    if (!trigger) return [];
    return trigger.evaluate({ tenantId, adminData, eventPayload });
  }
}
