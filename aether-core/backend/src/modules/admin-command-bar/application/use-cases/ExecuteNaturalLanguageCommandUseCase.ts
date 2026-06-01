import { CommandParserService } from '../services/CommandParserService';
import type { CommandLogPort } from '../ports/CommandLogPort';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { orchestrator } from '../../../../ai/orchestrator/Orchestrator';
import { computeIncrementalRevenueUplift } from '../../../../ai/attribution/OutcomeEngine';
import type { SupplierMonitorPort } from '../ports/SupplierMonitorPort';
import type { AdminDataPort } from '../ports/AdminDataPort';
import { ALL_INTENT_HANDLERS } from '../intents/handlers';
import type { IntentHandlerDeps } from '../intents/types';

function matchIntent(text: string): { intent: string; parameters?: Record<string, unknown> } | null {
  const lower = text.toLowerCase();
  if (/forecast|voorspel|demand/.test(lower)) return { intent: 'FORECAST' };
  if (/add|create|new/.test(lower) && /supplier|leverancier/.test(lower)) return { intent: 'SUPPLIER_CREATE' };
  if (/verify|billable/.test(lower) && /outcome|uplift/.test(lower)) return { intent: 'OUTCOME_VERIFY' };
  if (/email|mail|inbox/.test(lower) && /summary|overzicht|status/.test(lower)) return { intent: 'EMAIL_SUMMARY' };
  if (/outcome|uplift|attribution/.test(lower)) return { intent: 'OUTCOMES_REPORT' };
  if (/pending|openstaand/.test(lower) && /approval|goedkeuring/.test(lower)) return { intent: 'PENDING_APPROVALS' };
  if (/monitor.*supplier|supplier.*monitor/.test(lower)) return { intent: 'SUPPLIER_MONITOR' };
  if (/inventory|stock|voorraad/.test(lower)) return { intent: 'INVENTORY_STATUS' };
  if (/order|bestelling/.test(lower) && /status|overzicht/.test(lower)) return { intent: 'ORDER_STATUS' };
  if (/verhoog|raise|verlaag|lower/.test(lower) && /prijs|price/.test(lower)) {
    const pctMatch = lower.match(/(\d+)\s*%/);
    return { intent: 'PRICE_UPDATE', parameters: { percentage: pctMatch ? parseInt(pctMatch[1], 10) : 5 } };
  }
  if (/approve|goedkeur/.test(lower)) return { intent: 'APPROVE_CHANGES' };
  if (/margin|marge/.test(lower)) return { intent: 'LOW_MARGIN_REPORT' };
  return null;
}

export class ExecuteNaturalLanguageCommandUseCase {
  private parser = new CommandParserService();
  private handlerMap: Map<string, (typeof ALL_INTENT_HANDLERS)[0]>;
  private deps: IntentHandlerDeps;

  constructor(
    supplierMonitor: SupplierMonitorPort,
    adminData: AdminDataPort,
    private commandLog: CommandLogPort
  ) {
    this.deps = { supplierMonitor, adminData };
    this.handlerMap = new Map(ALL_INTENT_HANDLERS.map((h) => [h.intent, h]));
  }

  async execute(
    naturalLanguage: string,
    ctx: { tenantId: string; actorId?: string }
  ) {
    const parsedFromLlm = await this.parser.parseCommand(naturalLanguage);
    const regexMatch = matchIntent(naturalLanguage);

    let parsed =
      parsedFromLlm.confidence >= 0.6 && parsedFromLlm.intent !== 'ERROR' && parsedFromLlm.intent !== 'UNKNOWN'
        ? { ...parsedFromLlm, action: parsedFromLlm.action ?? null }
        : regexMatch
          ? { ...regexMatch, action: null, confidence: 0.85, source: 'regex' as const }
          : parsedFromLlm.intent !== 'ERROR'
            ? { ...parsedFromLlm, action: parsedFromLlm.action ?? null, source: 'llm' as const }
            : { intent: 'UNKNOWN', action: null, parameters: {}, confidence: 0, source: 'none' as const };

    let result = '';
    const handler = this.handlerMap.get(parsed.intent);

    if (handler) {
      const handlerResult = await handler.execute(
        naturalLanguage,
        parsed.parameters as Record<string, unknown> | undefined,
        ctx,
        this.deps
      );
      result = handlerResult.result;
    } else {
      result = `Command understood as ${parsed.intent}. No destructive action taken.`;
    }

    const uplift = await computeIncrementalRevenueUplift(ctx.tenantId);

    await this.commandLog.save({
      tenantId: ctx.tenantId,
      command: naturalLanguage,
      intent: parsed.intent,
      result,
      confidence: parsed.confidence,
      actor: ctx.actorId,
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'command_executed',
      actor: ctx.actorId,
      details: { intent: parsed.intent, result, verifiedUplift: uplift },
    });

    await orchestrator.execute({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      task: 'admin.command',
      input: { intent: parsed.intent, command: naturalLanguage },
    });

    return {
      success: true,
      originalCommand: naturalLanguage,
      parsedIntent: parsed.intent,
      action: parsed.action,
      result,
      confidence: parsed.confidence,
      verifiedUplift: uplift,
      timestamp: new Date().toISOString(),
    };
  }
}
