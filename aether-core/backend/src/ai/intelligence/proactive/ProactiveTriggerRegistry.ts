import type { ProactiveTriggerDefinition } from './ProactiveTriggerDefinition';
import { lowStockTrigger } from './triggers/lowStockTrigger';
import { supplierPriceDropTrigger } from './triggers/supplierPriceDropTrigger';
import { marginDeclineTrigger } from './triggers/marginDeclineTrigger';
import { orderAnomalyTrigger } from './triggers/orderAnomalyTrigger';
import { goalDriftTrigger } from '../goals/triggers/goalDriftTrigger';
import { customerChurnTrigger } from './triggers/customerChurnTrigger';

const DEFAULT_TRIGGERS: ProactiveTriggerDefinition[] = [
  lowStockTrigger,
  supplierPriceDropTrigger,
  marginDeclineTrigger,
  orderAnomalyTrigger,
  goalDriftTrigger,
  customerChurnTrigger,
];

export class ProactiveTriggerRegistry {
  private triggers = new Map<string, ProactiveTriggerDefinition>();

  constructor(initial: ProactiveTriggerDefinition[] = DEFAULT_TRIGGERS) {
    for (const trigger of initial) {
      this.register(trigger);
    }
  }

  register(trigger: ProactiveTriggerDefinition): void {
    this.triggers.set(trigger.id, trigger);
  }

  get(id: string): ProactiveTriggerDefinition | undefined {
    return this.triggers.get(id);
  }

  listAll(): ProactiveTriggerDefinition[] {
    return [...this.triggers.values()];
  }

  listPeriodic(): ProactiveTriggerDefinition[] {
    return this.listAll().filter((t) => t.mode === 'periodic');
  }

  listForEvent(eventType: string): ProactiveTriggerDefinition[] {
    return this.listAll().filter((t) => t.mode === 'event' && t.eventType === eventType);
  }
}

export const defaultProactiveTriggerRegistry = new ProactiveTriggerRegistry();
