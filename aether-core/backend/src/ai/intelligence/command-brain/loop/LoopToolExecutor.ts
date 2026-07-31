import type { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { AgentStreamCallback } from '../AgentStreamEvents';
import type { AgentLoopRunInput } from '../AgentLoopTypes';
import { emitLoopEvent } from './loopEvents';

export class LoopToolExecutor {
  constructor(private tools: PersonalBrainToolRegistry) {}

  async executeToolCall(
    tool: string,
    toolInput: Record<string, unknown>,
    input: AgentLoopRunInput,
    step: number,
    onEvent?: AgentStreamCallback
  ) {
    const result = await this.tools.execute(
      { tool, input: toolInput },
      {
        tenantId: input.tenantId,
        actorId: input.actorId,
        originalCommand: input.command,
        commandId: input.commandId,
        agentKey: input.agentKey,
        allowedTools: input.allowedTools,
        parentRunId: input.parentRunId,
        onEvent: onEvent ?? input.onEvent,
        peerDepth: input.peerDepth ?? 0,
      },
      {
        adaptiveLearningEnabled: input.adaptiveLearningEnabled,
        originalCommand: input.command,
      }
    );
    emitLoopEvent(onEvent, input.agentKey, {
      type: result.proposal ? 'proposal_ready' : 'tool_result',
      step,
      tool,
      output: result.output,
      proposalId: result.proposal?.proposalId,
      summary: result.proposal?.summary,
    });
    return result;
  }

  getToolListForInput(input: AgentLoopRunInput) {
    if (input.allowedTools?.length) {
      return this.tools.listForAgent(input.agentKey ?? 'admin', input.allowedTools);
    }
    return this.tools.list();
  }

  getSchemaPromptForInput(input: AgentLoopRunInput): string {
    if (input.allowedTools?.length) {
      return this.tools.getSchemaPromptForAgent(input.agentKey ?? 'admin', input.allowedTools);
    }
    return this.tools.getSchemaPrompt();
  }
}
