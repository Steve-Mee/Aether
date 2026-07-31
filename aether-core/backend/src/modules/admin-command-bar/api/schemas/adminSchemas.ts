import { z } from 'zod';

export const commandSchema = z.object({
  command: z.string().min(1).max(2000),
});

export const uiEventSchema = z.object({
  type: z.enum(['navigation']),
  path: z.string().min(1).max(500),
});

export const policyPatchSchema = z.object({
  autoApproveLowRisk: z.boolean().optional(),
  autoApproveMediumRiskMail: z.boolean().optional(),
  maxAutoPriceChangePct: z.number().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
});

export const notificationChannelSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
});

export const categoryScheduleSchema = z.object({
  mode: z.enum(['continuous', 'custom']).optional(),
  windowStart: z.string().max(5).nullable().optional(),
  windowEnd: z.string().max(5).nullable().optional(),
  useOutsideOfficePreset: z.boolean().optional(),
});

export const categoryPolicyPatchSchema = z.object({
  enabled: z.boolean().optional(),
  allowLowRiskAutoExecute: z.boolean().optional(),
  allowMediumRiskAutoExecute: z.boolean().optional(),
  schedule: categoryScheduleSchema.optional(),
});

export const agentOverridePatchSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().min(1).max(10).optional(),
  allowLowRiskAutoExecute: z.boolean().nullable().optional(),
  allowMediumRiskAutoExecute: z.boolean().nullable().optional(),
});

export const ruleConditionSchema = z.object({
  field: z.enum([
    'marginImpactEuro',
    'priceChangePct',
    'category',
    'riskClass',
    'agentKey',
    'dayOfWeek',
  ]),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

export const customRulePatchSchema = z.object({
  id: z.string().min(1).max(64),
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().min(0).max(100).optional(),
  conditions: z.array(ruleConditionSchema).max(8),
  outcome: z.enum(['allow_auto', 'require_approval', 'block']),
});

export const settingsPatchSchema = z.object({
  autonomyLevel: z.enum(['low', 'medium', 'high']).optional(),
  autoApproveLowRisk: z.boolean().optional(),
  autoApproveMediumRiskMail: z.boolean().optional(),
  maxAutoPriceChangePct: z.number().min(0).max(100).optional(),
  maxMarginImpactEuro: z.number().min(0).max(1_000_000).optional(),
  policyEnabled: z.boolean().optional(),
  autoRunWindow: z.enum(['always', 'outside_office', 'custom']).optional(),
  autoRunWindowStart: z.string().max(5).nullable().optional(),
  autoRunWindowEnd: z.string().max(5).nullable().optional(),
  notificationPrefs: z
    .object({
      autonomousLowRisk: notificationChannelSchema.optional(),
      highRiskApproval: notificationChannelSchema.optional(),
      supplierChanges: notificationChannelSchema.optional(),
      weeklyDigest: notificationChannelSchema.optional(),
      proactiveSuggestions: notificationChannelSchema.optional(),
      frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
    })
    .optional(),
  locale: z.enum(['nl', 'en']).optional(),
  dataExportEnabled: z.boolean().optional(),
  brainVectorBackend: z.enum(['pgvector', 'lancedb', 'memory']).nullable().optional(),
  brainKnowledgeTransferEnabled: z.boolean().nullable().optional(),
  brainKnowledgeUpdateProfile: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  brainFederatedContributionEnabled: z.boolean().optional(),
  brainKnowledgeGovernanceMode: z.enum(['contribute_only', 'receive_only', 'full_loop']).optional(),
  brainLoRAPath: z.string().max(500).nullable().optional(),
  brainActionMode: z.enum(['always_confirm', 'confirm_on_uncertain', 'adaptive']).optional(),
  brainAdaptiveLearningEnabled: z.boolean().optional(),
  brainAdaptiveAutoExecuteEnabled: z.boolean().optional(),
  brainCrossTenantAgentPatternsEnabled: z.boolean().optional(),
  brainFederatedExecutionContribute: z.boolean().optional(),
  brainBilateralExchangeEnabled: z.boolean().optional(),
  proactivePrefs: z
    .object({
      enabled: z.boolean().optional(),
      visibility: z.enum(['off', 'low_risk_only', 'all']).optional(),
      maxActive: z.number().min(1).max(20).optional(),
      snoozeDefaultHours: z.number().min(1).max(168).optional(),
      allowAutoExecute: z.boolean().optional(),
      categories: z
        .object({
          prijs: z.boolean().optional(),
          leverancier: z.boolean().optional(),
          voorraad: z.boolean().optional(),
          algemeen: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  explainabilityPrefs: z
    .object({
      detailLevel: z.enum(['off', 'simple', 'extended']).optional(),
      useLlmSummary: z.boolean().optional(),
      showLiveExplain: z.boolean().optional(),
      showSimilarActions: z.boolean().optional(),
      showCrossTenantSimilarActions: z.boolean().optional(),
    })
    .optional(),
  brainExplainabilityFederateEnabled: z.boolean().optional(),
  goalPrefs: z
    .object({
      enabled: z.boolean().optional(),
      maxActive: z.number().min(1).max(20).optional(),
      defaultPursuitMode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
      allowGoalLinkedAutoExecute: z.boolean().optional(),
      showOnCommandCenter: z.boolean().optional(),
      conflictResolution: z.enum(['manual', 'auto_deprioritize', 'auto_pause_lower']).optional(),
      allowFederatedContribution: z.boolean().optional(),
      showGlobalHints: z.boolean().optional(),
    })
    .optional(),
  autonomyPrefs: z
    .object({
      preset: z.enum(['conservative', 'balanced', 'aggressive', 'custom']).optional(),
      actionCategories: z
        .object({
          pricing: categoryPolicyPatchSchema.optional(),
          supplier: categoryPolicyPatchSchema.optional(),
          inventory: categoryPolicyPatchSchema.optional(),
          promotion: categoryPolicyPatchSchema.optional(),
          mail: categoryPolicyPatchSchema.optional(),
          negotiation: categoryPolicyPatchSchema.optional(),
          customer: categoryPolicyPatchSchema.optional(),
        })
        .optional(),
      agentOverrides: z
        .record(
          z.enum([
            'pricing',
            'supplier',
            'inventory',
            'promotion',
            'mail',
            'negotiation',
            'customer',
            'forecast',
            'catalog',
            'outcomes',
            'approvals',
          ]),
          agentOverridePatchSchema
        )
        .optional(),
      customRules: z.array(customRulePatchSchema).max(10).optional(),
    })
    .optional(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  metricType: z.enum(['margin', 'revenue', 'inventory', 'category_revenue']),
  metricScope: z
    .object({
      categoryId: z.string().optional(),
      productSlug: z.string().optional(),
      threshold: z.number().optional(),
    })
    .optional(),
  targetValue: z.number(),
  baselineValue: z.number().optional(),
  unit: z.enum(['percent', 'count', 'currency']).optional(),
  direction: z.enum(['increase', 'decrease']).optional(),
  deadline: z.string().min(1),
  pursuitMode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  parentGoalId: z.string().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  targetValue: z.number().optional(),
  deadline: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
  pursuitMode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  parentGoalId: z.string().optional(),
});

export const proactiveSnoozeSchema = z.object({
  hours: z.number().min(1).max(168).optional(),
});

export const brainToolExecuteSchema = z.object({
  proposalId: z.string().min(1),
  commandId: z.string().optional(),
});

export const autonomySimulateSchema = z.object({
  module: z.string().min(1).max(100),
  actionType: z.string().min(1).max(200),
  tool: z.string().max(100).optional(),
  intent: z.string().max(100).optional(),
  agentKey: z.string().max(50).optional(),
  payload: z.record(z.unknown()).optional(),
  simulateAt: z.string().datetime().optional(),
  riskClass: z.enum(['low', 'medium', 'high']).optional(),
});

export const webPushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  userAgent: z.string().optional(),
});

export const webPushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const markAllNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1).max(128)).optional(),
});
