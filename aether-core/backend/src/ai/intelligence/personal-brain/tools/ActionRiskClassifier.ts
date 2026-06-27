import type { ToolRisk } from './types';

export interface ActionRiskAssessment {
  risk: ToolRisk;
  requiresInbox: boolean;
  expectedImpact: string;
  confidence: number;
  rationale?: string;
}

export interface ClassifyBrainActionContext {
  parsedConfidence?: number;
  productCount?: number;
  /** Built proposal payload for tenant policy checks (e.g. updatePrice productIds). */
  policyPayload?: Record<string, unknown>;
}

/** Low-risk actions that executeLowRiskAction may run immediately (static). */
export const LOW_RISK_EXECUTE_WHITELIST = new Set(['createInsight']);

const READ_TOOLS = new Set([
  'search_products',
  'recall_memory',
  'getProductInfo',
  'get_collective_insights',
  'getPendingApprovals',
]);

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.68;
  return Math.min(1, Math.max(0, value));
}

function baseConfidence(ctx?: ClassifyBrainActionContext): number {
  if (ctx?.parsedConfidence != null) return clampConfidence(ctx.parsedConfidence);
  return 0.68;
}

export function classifyBrainAction(
  tool: string,
  input: Record<string, unknown>,
  ctx?: ClassifyBrainActionContext
): ActionRiskAssessment {
  if (READ_TOOLS.has(tool)) {
    return {
      risk: 'low',
      requiresInbox: false,
      expectedImpact: 'Geen wijziging — alleen informatie ophalen.',
      confidence: clampConfidence(ctx?.parsedConfidence ?? 0.85),
    };
  }

  if (tool === 'executeLowRiskAction') {
    const action = String(input.action ?? '');
    if (!LOW_RISK_EXECUTE_WHITELIST.has(action)) {
      return {
        risk: 'high',
        requiresInbox: true,
        expectedImpact: 'Actie niet toegestaan voor directe uitvoering.',
        confidence: 0.5,
        rationale: `${action} staat niet op de low-risk whitelist.`,
      };
    }
    return {
      risk: 'low',
      requiresInbox: false,
      expectedImpact: 'Low-risk actie — direct uitvoerbaar zonder goedkeuring.',
      confidence: baseConfidence(ctx),
      rationale: 'Whitelisted low-risk actie.',
    };
  }

  if (tool === 'createInsight') {
    return {
      risk: 'low',
      requiresInbox: false,
      expectedImpact: 'Slaat een inzicht op in het persoonlijke brein — geen cataloguswijziging.',
      confidence: clampConfidence(Number(input.confidence ?? baseConfidence(ctx))),
      rationale: 'Merchant-specifiek geheugen; geen externe impact.',
    };
  }

  if (tool === 'updatePrice') {
    const pct = Number(input.percentage ?? 5);
    const absPct = Math.abs(pct);
    const risk: ToolRisk = absPct > 10 ? 'high' : 'medium';
    const productCount = ctx?.productCount ?? 1;
    return {
      risk,
      requiresInbox: risk === 'high' || absPct > 5,
      expectedImpact: `Marge en conversie kunnen verschuiven · prijswijziging ca. ${pct}% · ${productCount} product(en).`,
      confidence: absPct > 10 ? 0.58 : absPct > 5 ? 0.65 : 0.72,
      rationale: `Prijsaanpassing van ${pct}% vereist merchant-controle bij grotere wijzigingen.`,
    };
  }

  if (tool === 'suggestRestock') {
    const itemCount = ctx?.productCount ?? Number(input.itemCount ?? 1);
    const totalDelta = Number(input.totalDelta ?? itemCount * 10);
    const risk: ToolRisk = itemCount > 5 || totalDelta > 100 ? 'high' : itemCount > 3 ? 'medium' : 'low';
    return {
      risk,
      requiresInbox: risk !== 'low',
      expectedImpact: `Voorraad aanvullen voor ${itemCount} SKU(s) (+${totalDelta} eenheden).`,
      confidence: itemCount > 5 ? 0.58 : 0.68,
      rationale: 'Restock wijzigt voorraadniveaus — grotere batches vereisen goedkeuring.',
    };
  }

  if (tool === 'syncSupplier') {
    const supplierId = String(input.supplierId ?? 'leverancier');
    return {
      risk: 'medium',
      requiresInbox: true,
      expectedImpact: `Catalogus en voorraad synchroniseren met ${supplierId}.`,
      confidence: 0.65,
      rationale: 'Leverancierssync kan product- en prijsdata wijzigen.',
    };
  }

  if (tool === 'createApproval') {
    const actionType = String(input.actionType ?? 'actie');
    return {
      risk: 'high',
      requiresInbox: true,
      expectedImpact: `High-risk goedkeuring voor ${actionType} — wacht op merchant-beslissing.`,
      confidence: clampConfidence(Number(input.confidence ?? 0.58)),
      rationale: String(input.rationale ?? 'Brein stelt een high-risk actie voor ter goedkeuring.'),
    };
  }

  return {
    risk: 'medium',
    requiresInbox: true,
    expectedImpact: 'Autonome actie wacht op jouw beslissing.',
    confidence: baseConfidence(ctx),
  };
}

export function isLowRiskExecutable(tool: string): boolean {
  return LOW_RISK_EXECUTE_WHITELIST.has(tool);
}

/** Static whitelist check (sync). Use isLowRiskExecutableAsync for updatePrice policy gating. */
export function isStaticLowRiskExecutable(tool: string): boolean {
  return LOW_RISK_EXECUTE_WHITELIST.has(tool);
}
