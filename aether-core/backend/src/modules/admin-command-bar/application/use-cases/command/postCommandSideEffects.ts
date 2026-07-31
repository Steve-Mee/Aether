import { writeAuditLog } from '../../../../../shared/audit/auditService';
import type { BrainResponseService } from '../../../../../ai/intelligence/command-brain/BrainResponseService';
import type { PlanMemoryService } from '../../../../../ai/intelligence/command-brain/PlanMemoryService';
import type { PersonalBrainMemoryService } from '../../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';
import { resolveTrigger } from '../../../../../ai/intelligence/personal-brain/reflection/ReflectionTriggerPolicy';
import { setReflectionExperimentOverride } from '../../../../../ai/intelligence/personal-brain/reflection/ReflectionExperimentOverrides';
import type { AgentSupervisorPort } from '../../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import { shouldDelegateFromAdmin } from '../../../../../ai/intelligence/multi-agent/delegationConfig';
import type { SpecialistMeta } from '../../../../../ai/intelligence/multi-agent/types';
import type { ReflectionMetricsRecorder } from '../../../../../ai/intelligence/personal-brain/reflection/ReflectionMetricsRecorder';
import type { ReflectionDistillationService } from '../../../../../ai/intelligence/global-knowledge/distillation/ReflectionDistillationService';
import type { KnowledgeContributionService } from '../../../../../ai/intelligence/knowledge-transfer/contribution/KnowledgeContributionService';
import type { BrainAdaptiveLearningService } from '../../../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import { shouldAutoExecuteProposal } from '../../../../../ai/intelligence/command-brain/BrainAutoExecutePolicy';
import { shouldPolicyAutoExecuteProposal } from '../../../../../ai/intelligence/command-brain/BrainPolicyAutoExecutePolicy';
import type { ExecuteBrainToolUseCase } from '../ExecuteBrainToolUseCase';
import type { ToolProposal } from '../../../../../ai/intelligence/personal-brain/tools/types';
import type { MerchantSettings } from '../../../../../shared/settings/merchantSettingsTypes';

export interface PostCommandSideEffectsDeps {
  planMemory?: PlanMemoryService;
  personalBrainMemory?: PersonalBrainMemoryService;
  agentSupervisor?: AgentSupervisorPort;
  reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  reflectionDistillationService?: ReflectionDistillationService;
  knowledgeContributionService?: KnowledgeContributionService;
  executeBrainTool?: ExecuteBrainToolUseCase;
  adaptiveLearning?: BrainAdaptiveLearningService;
}

export interface PostCommandSideEffectsInput {
  tenantId: string;
  actorId?: string;
  naturalLanguage: string;
  parsedIntent: string;
  brainResponse: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
  specialistMeta?: SpecialistMeta;
  contextSnippets: string[];
  rootRunId?: string;
  settings: MerchantSettings;
  experimentVariantArm: 'control' | 'treatment';
}

export interface PostCommandSideEffectsResult {
  reflectionStored?: string;
  knowledgeContributionNotice?: string;
  pendingActions: ToolProposal[];
  autoExecuted: Array<{ proposalId: string; result: string }>;
}

export async function postCommandSideEffects(
  deps: PostCommandSideEffectsDeps,
  input: PostCommandSideEffectsInput
): Promise<PostCommandSideEffectsResult> {
  const {
    planMemory,
    personalBrainMemory,
    agentSupervisor,
    reflectionMetricsRecorder,
    reflectionDistillationService,
    knowledgeContributionService,
    executeBrainTool,
    adaptiveLearning,
  } = deps;

  const {
    tenantId,
    actorId,
    naturalLanguage,
    parsedIntent,
    brainResponse,
    specialistMeta,
    contextSnippets,
    rootRunId,
    settings,
    experimentVariantArm,
  } = input;

  if (
    planMemory &&
    brainResponse.summary?.goalReached &&
    brainResponse.plan &&
    !brainResponse.checkpoint
  ) {
    await planMemory.rememberPlan(tenantId, {
      command: naturalLanguage,
      plan: brainResponse.plan,
      summary: brainResponse.summary,
      toolTrace: brainResponse.toolTrace,
    });
  }

  let reflectionStored: string | undefined;
  let knowledgeContributionNotice: string | undefined;

  const delegationTarget = specialistMeta?.agentKey ?? agentSupervisor?.resolveTargetAgent(parsedIntent) ?? null;
  const reflectionAgentKey = delegationTarget ?? 'admin';

  if (
    !specialistMeta &&
    agentSupervisor?.isDelegationEnabled() &&
    brainResponse.agentRunId &&
    delegationTarget &&
    shouldDelegateFromAdmin(parsedIntent)
  ) {
    try {
      await agentSupervisor.delegate({
        tenantId,
        targetAgentKey: delegationTarget,
        intent: parsedIntent,
        command: naturalLanguage,
        context: contextSnippets,
        parentRunId: rootRunId ?? brainResponse.agentRunId,
      });
    } catch {
      // Delegation is best-effort
    }
  }

  if (personalBrainMemory && brainResponse.summary && !brainResponse.checkpoint) {
    const toolsUsed = brainResponse.toolTrace?.length ?? 0;
    const usedAgentLoop =
      Boolean(brainResponse.agentRunId) ||
      Boolean(brainResponse.plan) ||
      toolsUsed > 0;
    const trigger = resolveTrigger({
      intent: parsedIntent,
      goalReached: brainResponse.summary.goalReached,
      toolsUsed,
      usedAgentLoop,
      checkpoint: Boolean(brainResponse.checkpoint),
    });

    if (trigger) {
      try {
        const reflectionResult = await personalBrainMemory.recordExperienceReflection({
          tenantId,
          command: naturalLanguage,
          intent: parsedIntent,
          summary: brainResponse.summary,
          plan: brainResponse.plan,
          toolTrace: brainResponse.toolTrace,
          reflections: brainResponse.summary.reflections,
          trigger,
          usedAgentLoop,
          checkpoint: Boolean(brainResponse.checkpoint),
          agentKey: reflectionAgentKey,
        });
        if (reflectionResult?.memoryIds.length) {
          reflectionStored = 'Ik heb deze ervaring opgeslagen om later beter te handelen.';
        }

        if (reflectionResult?.reflection && reflectionMetricsRecorder) {
          try {
            await reflectionMetricsRecorder.recordGoalReached(
              tenantId,
              brainResponse.summary.goalReached,
              brainResponse.agentRunId,
              experimentVariantArm
            );
            if (delegationTarget) {
              await reflectionMetricsRecorder.recordDelegationSuccess(
                tenantId,
                brainResponse.summary.goalReached,
                brainResponse.agentRunId,
                experimentVariantArm
              );
            }
          } catch {
            // Metrics are best-effort
          }
        }

        if (reflectionResult?.reflection && knowledgeContributionService) {
          try {
            const reflectionContribution =
              await knowledgeContributionService.contributeFromReflection(
                tenantId,
                reflectionResult.reflection
              );
            if (reflectionContribution.notice && !knowledgeContributionNotice) {
              knowledgeContributionNotice = reflectionContribution.notice;
            }
          } catch {
            // Reflection contribution is best-effort
          }
        }
      } catch {
        // Reflection memory is best-effort
      }
    }
  }

  if (reflectionDistillationService && brainResponse.runStatus === 'completed') {
    try {
      await reflectionDistillationService.distillFromReflections(tenantId);
    } catch {
      // Distillation is best-effort
    }
  }

  setReflectionExperimentOverride(null);

  if (
    knowledgeContributionService &&
    brainResponse.runStatus === 'completed' &&
    brainResponse.summary?.goalReached &&
    (brainResponse.toolTrace?.length ?? 0) >= 2
  ) {
    try {
      const contribution = await knowledgeContributionService.contributeFromAgentRun(
        tenantId,
        {
          parsedIntent,
          summary: brainResponse.summary,
          toolTrace: brainResponse.toolTrace ?? [],
          goalReached: true,
        }
      );
      knowledgeContributionNotice = contribution.notice;
    } catch {
      // best-effort contribution
    }
  }

  let pendingActions = brainResponse.pendingActions ?? [];
  const autoExecuted: Array<{ proposalId: string; result: string }> = [];

  if (executeBrainTool && settings.brainAdaptiveAutoExecuteEnabled) {
    const remaining: ToolProposal[] = [];
    for (const proposal of pendingActions) {
      const learnedPreference = adaptiveLearning
        ? await adaptiveLearning.getLearnedPreference(tenantId, proposal.tool)
        : null;
      const autoCheck = await shouldAutoExecuteProposal({
        tenantId,
        settings,
        proposal,
        learnedPreference,
      });
      if (autoCheck.eligible) {
        const exec = await executeBrainTool.execute(proposal.proposalId, {
          tenantId,
          actorId: actorId ?? 'aether',
        });
        if (exec.success) {
          autoExecuted.push({ proposalId: proposal.proposalId, result: exec.message });
          await writeAuditLog({
            tenantId,
            module: 'admin-command-bar',
            action: 'brain_tool_auto_executed',
            actor: actorId ?? 'aether',
            details: { proposalId: proposal.proposalId, tool: proposal.tool },
          });
          continue;
        }
      }
      remaining.push(proposal);
    }
    pendingActions = remaining;
  }

  if (executeBrainTool && settings.policyEnabled) {
    const remaining: ToolProposal[] = [];
    for (const proposal of pendingActions) {
      const policyCheck = await shouldPolicyAutoExecuteProposal({
        tenantId,
        settings,
        proposal,
      });
      if (policyCheck.eligible) {
        const exec = await executeBrainTool.execute(proposal.proposalId, {
          tenantId,
          actorId: actorId ?? 'aether',
        });
        if (exec.success) {
          autoExecuted.push({ proposalId: proposal.proposalId, result: exec.message });
          await writeAuditLog({
            tenantId,
            module: 'admin-command-bar',
            action: 'brain_tool_auto_executed',
            actor: actorId ?? 'aether',
            details: {
              proposalId: proposal.proposalId,
              tool: proposal.tool,
              via: 'tenant_policy',
              reason: policyCheck.reason,
            },
          });
          continue;
        }
      }
      remaining.push(proposal);
    }
    pendingActions = remaining;
  }

  return {
    reflectionStored,
    knowledgeContributionNotice,
    pendingActions,
    autoExecuted,
  };
}
