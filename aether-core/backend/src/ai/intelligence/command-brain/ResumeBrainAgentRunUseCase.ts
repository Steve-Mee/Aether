import { BrainAgentLoop } from './BrainAgentLoop';
import {
  getBrainAgentRunByApprovalId,
  getBrainAgentRunById,
  parseResumeContext,
} from './BrainAgentRunStore';
import type { PersonalBrainMemoryService } from '../personal-brain/memory/PersonalBrainMemoryService';
import { resolveTrigger } from '../personal-brain/reflection/ReflectionTriggerPolicy';

export class ResumeBrainAgentRunUseCase {
  constructor(
    private agentLoop: BrainAgentLoop,
    private personalBrainMemory?: PersonalBrainMemoryService
  ) {}

  async execute(agentRunId: string, tenantId: string) {
    return this.resumeRun(agentRunId, tenantId);
  }

  async resumeByApprovalId(approvalId: string, tenantId: string) {
    const run = await getBrainAgentRunByApprovalId(approvalId, tenantId);
    if (!run) {
      return { resumed: false as const, reason: 'No awaiting agent run for approval' };
    }
    const result = await this.resumeRun(run.id, tenantId);
    return { resumed: true as const, agentRunId: run.id, result };
  }

  private async resumeRun(agentRunId: string, tenantId: string) {
    const run = await getBrainAgentRunById(agentRunId, tenantId);
    const ctx = run ? parseResumeContext(run.resumeContext) : null;
    let memoryPromptBlock = ctx?.memoryPromptBlock;

    if (this.personalBrainMemory && ctx?.command) {
      try {
        const recall = await this.personalBrainMemory.recallForCommand(tenantId, ctx.command);
        if (recall.promptBlock) {
          memoryPromptBlock = recall.promptBlock;
        }
      } catch {
        // Memory re-recall on resume is best-effort
      }
    }

    const result = await this.agentLoop.resume(agentRunId, tenantId, { memoryPromptBlock });

    if (
      this.personalBrainMemory &&
      ctx &&
      result.runStatus === 'completed' &&
      !result.checkpoint
    ) {
      try {
        await this.personalBrainMemory.recordOutcome({
          tenantId,
          command: ctx.command,
          intent: ctx.parsedIntent,
          outcome: result.narrative || ctx.handlerResult,
          success: !result.error,
          confidence: 0.85,
          commandId: ctx.commandId ?? run?.commandId ?? undefined,
          goalReached: result.summary?.goalReached,
          toolsUsed: result.toolTrace?.length,
        });
        const toolsUsed = result.toolTrace?.length ?? 0;
        const usedAgentLoop = toolsUsed > 0 || Boolean(result.plan);
        const trigger = resolveTrigger({
          intent: ctx.parsedIntent,
          goalReached: result.summary?.goalReached ?? false,
          toolsUsed,
          usedAgentLoop,
          checkpoint: Boolean(result.checkpoint),
        });

        if (trigger && result.summary) {
          await this.personalBrainMemory.recordExperienceReflection({
            tenantId,
            command: ctx.command,
            intent: ctx.parsedIntent,
            summary: result.summary,
            plan: result.plan,
            toolTrace: result.toolTrace,
            reflections: result.summary.reflections,
            trigger,
            usedAgentLoop,
            checkpoint: Boolean(result.checkpoint),
          });
        }
      } catch {
        // Post-resume memory write is best-effort
      }
    }

    return result;
  }
}
