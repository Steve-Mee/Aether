import type {
  ExplainabilityBuildContext,
  ExplainabilityContributor,
  ExplainabilityDataSource,
  ExplainabilityDetailLevel,
  ExplainabilityPayload,
  ExplainabilityPersistLevel,
} from './types';
import { agentExplainLabel } from './agentLabels';
import { buildFlowGraph } from './buildFlowGraph';

const PREVIEW_MAX = 200;

function truncate(text: string, max = PREVIEW_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function buildNlSummary(ctx: ExplainabilityBuildContext): string {
  const agentLabels = ctx.agents.map((a) => a.label);
  const uniqueAgents = [...new Set(agentLabels)];

  if (uniqueAgents.length === 0 && ctx.dataSources.length === 0) {
    return 'AETHER heeft deze actie uitgevoerd op basis van je huidige gegevens en beleid.';
  }

  const evidence = ctx.dataSources.find((d) => d.kind === 'trigger_evidence');
  const evidencePart = evidence ? ` op basis van ${evidence.label.toLowerCase()}` : '';

  if (uniqueAgents.length === 0) {
    return `AETHER heeft een analyse uitgevoerd${evidencePart}.`;
  }
  if (uniqueAgents.length === 1) {
    return `${uniqueAgents[0]} heeft gewerkt${evidencePart}.`;
  }
  if (uniqueAgents.length === 2) {
    return `${uniqueAgents[0]} en ${uniqueAgents[1]} hebben samengewerkt${evidencePart}.`;
  }
  const last = uniqueAgents.pop();
  return `${uniqueAgents.join(', ')} en ${last} hebben samengewerkt${evidencePart}.`;
}

function applyContributors(
  ctx: ExplainabilityBuildContext,
  contributors: ExplainabilityContributor[]
): void {
  for (const contributor of contributors) {
    const result = contributor.contribute(ctx);
    if (!result) continue;
    if (result.dataSources) ctx.dataSources.push(...result.dataSources);
    if (result.reasoningSteps) ctx.reasoningSteps.push(...result.reasoningSteps);
    if (result.policyNotes) ctx.policyNotes.push(...result.policyNotes);
  }
}

export function evidenceToDataSources(evidence: Record<string, unknown>): ExplainabilityDataSource[] {
  const sources: ExplainabilityDataSource[] = [];
  if (typeof evidence.lowStockCount === 'number') {
    sources.push({
      kind: 'trigger_evidence',
      label: `${evidence.lowStockCount} SKU's met lage voorraad`,
    });
  }
  if (typeof evidence.lowMarginCount === 'number') {
    sources.push({
      kind: 'trigger_evidence',
      label: `${evidence.lowMarginCount} SKU's met lage marge`,
    });
  }
  if (typeof evidence.changePercent === 'number') {
    sources.push({
      kind: 'trigger_evidence',
      label: `${evidence.changePercent}% prijsverandering`,
    });
  }
  if (typeof evidence.trendPct === 'number') {
    sources.push({
      kind: 'trigger_evidence',
      label: `${Math.abs(evidence.trendPct as number).toFixed(0)}% trend`,
    });
  }
  if (typeof evidence.supplierId === 'string') {
    sources.push({
      kind: 'trigger_evidence',
      label: 'Leverancierssignaal gedetecteerd',
    });
  }
  if (typeof evidence.triggerId === 'string') {
    sources.push({
      kind: 'trigger_evidence',
      label: `Trigger: ${evidence.triggerId}`,
    });
  }
  return sources;
}

export class ExplainabilityBuilder {
  constructor(private contributors: ExplainabilityContributor[] = []) {}

  build(
    ctx: ExplainabilityBuildContext,
    userPref: ExplainabilityDetailLevel
  ): { payload: ExplainabilityPayload; persistLevel: ExplainabilityPersistLevel } {
    applyContributors(ctx, this.contributors);

    if (ctx.planReasoning) {
      ctx.reasoningSteps.unshift({
        label: 'Redenering',
        detail: ctx.planReasoning,
      });
    }

    if (ctx.executionMode && ctx.executionMode !== 'single') {
      ctx.policyNotes.push(
        ctx.executionMode === 'parallel'
          ? 'Agents werkten parallel aan verschillende deelvragen.'
          : 'Agents werkten sequentieel — elke agent bouwde voort op de vorige.'
      );
    }

    const summary = buildNlSummary(ctx);
    const handoffChain =
      ctx.handoffChain.length > 0 ? ctx.handoffChain.map((e) => ({ ...e })) : undefined;
    const flowGraph =
      userPref === 'extended'
        ? buildFlowGraph({
            agents: ctx.agents,
            handoffChain: ctx.handoffChain,
            executionMode: ctx.executionMode,
          })
        : undefined;

    const fullPayload: ExplainabilityPayload = {
      summary,
      agents: ctx.agents.map((a) => ({ ...a })),
      dataSources: ctx.dataSources.map((d) => ({ ...d })),
      reasoningSteps: ctx.reasoningSteps.map((s) => ({ ...s })),
      reflections: ctx.reflections.map((r) => ({ ...r })),
      handoffChain,
      globalKnowledge: ctx.globalKnowledge,
      policyNotes: ctx.policyNotes.length > 0 ? [...ctx.policyNotes] : undefined,
      flowGraph,
    };

    if (userPref === 'off') {
      return {
        persistLevel: 'minimal',
        payload: {
          summary,
          agents: fullPayload.agents.map((a) => ({
            agentKey: a.agentKey,
            role: a.role,
            label: a.label,
          })),
          dataSources: [],
          reasoningSteps: [],
          reflections: [],
        },
      };
    }

    if (userPref === 'simple') {
      return {
        persistLevel: 'simple',
        payload: {
          ...fullPayload,
          dataSources: fullPayload.dataSources.map((d) => ({
            kind: d.kind,
            label: d.label,
            score: d.score,
          })),
          reasoningSteps: fullPayload.reasoningSteps.slice(0, 8).map((s) => ({
            label: s.label,
            at: s.at,
          })),
          reflections: [],
          handoffChain: undefined,
        },
      };
    }

    return {
      persistLevel: 'extended',
      payload: {
        ...fullPayload,
        dataSources: fullPayload.dataSources.map((d) => ({
          ...d,
          preview: d.preview ? truncate(d.preview) : undefined,
        })),
      },
    };
  }

  static buildFromProactiveEvidence(params: {
    triggerId: string;
    agentKey?: string;
    title: string;
    evidence: Record<string, unknown>;
    userPref: ExplainabilityDetailLevel;
  }): { payload: ExplainabilityPayload; persistLevel: ExplainabilityPersistLevel } {
    const dataSources = evidenceToDataSources({
      ...params.evidence,
      triggerId: params.triggerId,
    });
    const agents = params.agentKey
      ? [
          {
            agentKey: params.agentKey,
            role: 'specialist' as const,
            label: agentExplainLabel(params.agentKey),
          },
        ]
      : [];

    const ctx: ExplainabilityBuildContext = {
      agents,
      dataSources,
      reasoningSteps: [
        {
          label: 'Proactief signaal gedetecteerd',
          detail: params.title,
        },
      ],
      reflections: [],
      handoffChain: [],
      policyNotes: [],
    };

    return new ExplainabilityBuilder().build(ctx, params.userPref);
  }
}
