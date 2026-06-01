import { SupplierMonitorPort } from '../ports/SupplierMonitorPort';
import { AdminDataPort } from '../ports/AdminDataPort';

export interface IntentContext {
  tenantId: string;
  actorId?: string;
}

export interface IntentResult {
  result: string;
  /** Operational metadata — never used for billable outcome calculation */
  operationalMeta?: Record<string, unknown>;
}

export interface IntentHandler {
  readonly intent: string;
  execute(
    naturalLanguage: string,
    parameters: Record<string, unknown> | undefined,
    ctx: IntentContext,
    deps: IntentHandlerDeps
  ): Promise<IntentResult>;
}

export interface IntentHandlerDeps {
  supplierMonitor: SupplierMonitorPort;
  adminData: AdminDataPort;
}
