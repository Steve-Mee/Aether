import { DefaultKnowledgeTransferGate } from '../../knowledge-transfer/DefaultKnowledgeTransferGate';
import type { BrainAdaptiveLearningService } from '../../command-brain/BrainAdaptiveLearningService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { buildApprovalRationale } from '../../command-brain/BrainApprovalRationaleBuilder';
import { createBrainToolProposal } from './BrainToolProposalStore';
import { createDefaultBrainTools } from './defaultTools';
import { executeLowRiskActionTool } from './executeTools';
import type {
  BrainToolCall,
  BrainToolContext,
  BrainToolExecutor,
  BrainToolTraceEntry,
  PersonalBrainToolRegistryDeps,
  ToolExecutionResult,
  ToolProposal,
} from './types';

export class PersonalBrainToolRegistry {
  private tools = new Map<string, BrainToolExecutor>();

  constructor(
    private deps: PersonalBrainToolRegistryDeps,
    private adaptiveLearning?: BrainAdaptiveLearningService
  ) {
    this.registerDefaults();
  }

  setSupplierMonitor(
    supplierMonitor: PersonalBrainToolRegistryDeps['supplierMonitor']
  ): void {
    this.deps.supplierMonitor = supplierMonitor;
  }

  private registerDefaults(): void {
    for (const tool of createDefaultBrainTools(this.deps)) {
      this.tools.set(tool.definition.name, tool);
    }
    this.tools.set(
      'executeLowRiskAction',
      executeLowRiskActionTool(
        (name) => this.getExecutor(name),
        (name, ctx, payload) => this.executeConfirmed(name, ctx, payload),
        async (name, ctx, input) => {
          const executor = this.getExecutor(name);
          if (!executor?.buildProposal) {
            throw new Error(`Tool ${name} cannot build proposal`);
          }
          const draft = await executor.buildProposal(ctx, input);
          return { payload: draft.payload, requiresApproval: draft.requiresApproval };
        }
      )
    );
  }

  register(tool: BrainToolExecutor): void {
    this.tools.set(tool.definition.name, tool);
  }

  listForAgent(_agentKey: string, allowedTools: string[]): BrainToolDefinition[] {
    const allowed = new Set(allowedTools);
    return [...this.tools.values()]
      .filter((t) => allowed.has(t.definition.name))
      .map((t) => t.definition);
  }

  isToolAllowed(toolName: string, allowedTools?: string[]): boolean {
    if (!allowedTools || allowedTools.length === 0) return true;
    return allowedTools.includes(toolName);
  }

  list(): BrainToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  getSchemaPromptForAgent(_agentKey: string, allowedTools: string[]): string {
    const defs = this.listForAgent(_agentKey, allowedTools);
    const lines = defs.map((t) => {
      const params = Object.entries(t.parameters)
        .map(([k, v]) => `${k}${v.required ? '' : '?'}: ${v.type}`)
        .join(', ');
      return `- ${t.name} (${t.kind}, ${t.risk}): { ${params} } — ${t.description}`;
    });
    return `
Available tools (respond with JSON { "tool": "name", "input": { ... } } or { "final": { "narrative": "...", "actionProposal": "..." } }):
${lines.join('\n')}
Read tools execute immediately. Propose tools create merchant proposals (medium/high → Goedkeuringen inbox).
Use createApproval to route high-risk actions to the approval inbox. Use executeLowRiskAction for whitelisted low-risk mutations.
`;
  }

  getSchemaPrompt(): string {
    const lines = [...this.tools.values()].map((t) => {
      const params = Object.entries(t.definition.parameters)
        .map(([k, v]) => `${k}${v.required ? '' : '?'}: ${v.type}`)
        .join(', ');
      return `- ${t.definition.name} (${t.definition.kind}, ${t.definition.risk}): { ${params} } — ${t.definition.description}`;
    });
    return `
Available tools (respond with JSON { "tool": "name", "input": { ... } } or { "final": { "narrative": "...", "actionProposal": "..." } }):
${lines.join('\n')}
Read tools execute immediately. Propose tools create merchant proposals (medium/high → Goedkeuringen inbox).
Use createApproval to route high-risk actions to the approval inbox. Use executeLowRiskAction for whitelisted low-risk mutations.
`;
  }

  private async logToolCalled(
    ctx: BrainToolContext,
    tool: string,
    kind: string,
    status: string,
    extra?: Record<string, unknown>
  ): Promise<void> {
    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'brain_tool_called',
      actor: ctx.actorId,
      details: { tool, kind, status, commandId: ctx.commandId, ...extra },
    });
  }

  async execute(
    call: BrainToolCall,
    ctx: BrainToolContext,
    options?: { adaptiveLearningEnabled?: boolean; originalCommand?: string }
  ): Promise<{ output: string; trace: BrainToolTraceEntry; proposal?: ToolProposal }> {
    if (!this.isToolAllowed(call.tool, ctx.allowedTools)) {
      const output = JSON.stringify({ error: `Tool ${call.tool} not allowed for agent ${ctx.agentKey ?? 'admin'}` });
      return { output, trace: { tool: call.tool, input: call.input, output, status: 'error' } };
    }

    const executor = this.tools.get(call.tool);
    if (!executor) {
      const output = JSON.stringify({ error: `Unknown tool: ${call.tool}` });
      return { output, trace: { tool: call.tool, input: call.input, output, status: 'error' } };
    }

    const validation = executor.validate(call.input ?? {});
    if (!validation.ok) {
      const output = JSON.stringify({ error: validation.error });
      await this.logToolCalled(ctx, call.tool, executor.definition.kind, 'validation_error');
      return { output, trace: { tool: call.tool, input: call.input, output, status: 'error' } };
    }

    if (executor.definition.kind === 'read') {
      try {
        const result = await executor.executeRead(ctx, call.input ?? {});
        const parsed = typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : {};
        const isError = parsed.success === false || parsed.error != null;
        const status = isError ? 'error' : 'ok';

        await this.logToolCalled(ctx, call.tool, 'read', status, {
          approvalId: typeof parsed.approvalId === 'string' ? parsed.approvalId : undefined,
        });

        if (call.tool === 'executeLowRiskAction' && !isError && parsed.success === true) {
          await writeAuditLog({
            tenantId: ctx.tenantId,
            module: 'admin-command-bar',
            action: 'brain_tool_executed',
            actor: ctx.actorId,
            details: {
              tool: String(parsed.action ?? call.tool),
              via: 'executeLowRiskAction',
              result: parsed.result,
              commandId: ctx.commandId,
            },
          });
        }

        const output = JSON.stringify(result);
        return { output, trace: { tool: call.tool, input: call.input, output, status: isError ? 'error' : 'ok' } };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tool failed';
        const output = JSON.stringify({ error: message });
        await this.logToolCalled(ctx, call.tool, 'read', 'error', { error: message });
        return { output, trace: { tool: call.tool, input: call.input, output, status: 'error' } };
      }
    }

    if (!executor.buildProposal) {
      const output = JSON.stringify({ error: 'Tool cannot propose' });
      return { output, trace: { tool: call.tool, input: call.input, output, status: 'error' } };
    }

    try {
      const draft = await executor.buildProposal(ctx, call.input ?? {});
      let learnedHint: string | undefined;
      if (options?.adaptiveLearningEnabled && this.adaptiveLearning) {
        const combined = await this.adaptiveLearning.getCombinedHint(ctx.tenantId, {
          tool: call.tool,
          query: options.originalCommand ?? draft.summary,
          agentKey: ctx.agentKey,
        });
        learnedHint = combined.hint ?? undefined;
      }

      await this.logToolCalled(ctx, call.tool, 'propose', 'draft', {
        risk: draft.risk,
        requiresApproval: draft.requiresApproval,
      });

      const rationaleBundle = await buildApprovalRationale({
        tenantId: ctx.tenantId,
        tool: draft.tool,
        baseRationale: draft.rationale,
        learnedHint,
        ktGate: this.deps.ktGate,
        globalBrain: this.deps.globalBrain,
      });

      const saved = await createBrainToolProposal({
        tenantId: ctx.tenantId,
        tool: draft.tool,
        summary: draft.summary,
        risk: draft.risk,
        payload: draft.payload,
        commandId: ctx.commandId,
        actorId: ctx.actorId,
        requiresInbox: draft.requiresApproval,
        expectedImpact: draft.expectedImpact,
        confidence: draft.confidence,
        rationale: rationaleBundle.rationale,
        learnedHint: rationaleBundle.learnedHint,
        ktSnippets: rationaleBundle.ktSnippets,
      });

      const proposal: ToolProposal = {
        ...saved,
        learnedHint,
        requiresApproval: draft.requiresApproval,
        expectedImpact: draft.expectedImpact,
        confidence: draft.confidence,
        rationale: rationaleBundle.rationale,
      };
      const output = JSON.stringify({
        proposed: true,
        proposalId: proposal.proposalId,
        summary: proposal.summary,
        risk: proposal.risk,
        requiresApproval: proposal.requiresApproval,
        approvalId: proposal.approvalId,
      });
      return {
        output,
        trace: { tool: call.tool, input: call.input, output, status: 'proposed' },
        proposal,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proposal failed';
      const output = JSON.stringify({ error: message });
      await this.logToolCalled(ctx, call.tool, 'propose', 'error', { error: message });
      return { output, trace: { tool: call.tool, input: call.input, output, status: 'error' } };
    }
  }

  async executeConfirmed(
    toolName: string,
    ctx: BrainToolContext,
    payload: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const executor = this.tools.get(toolName);
    if (!executor?.executeConfirmed) {
      return { success: false, result: '', error: `Tool ${toolName} cannot execute` };
    }
    try {
      return await executor.executeConfirmed(ctx, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      return { success: false, result: '', error: message };
    }
  }

  getExecutor(name: string): BrainToolExecutor | undefined {
    return this.tools.get(name);
  }
}

export type BrainToolDefinition = BrainToolExecutor['definition'];

export { DefaultKnowledgeTransferGate };
