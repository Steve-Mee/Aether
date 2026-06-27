import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';

const createPatchSchema = z.object({
  patchKey: z.string().min(1).max(120),
  kind: z.enum([
    'pattern',
    'prompt_template',
    'optimization_rule',
    'metric_insight',
    'lora_trait',
    'lora_config',
    'vector_distilled',
  ]),
  category: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.number().int().min(1).max(10).optional(),
  minProfile: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  tags: z.array(z.string()).optional(),
  payload: z.record(z.unknown()).optional(),
});

const updatePatchSchema = createPatchSchema.partial().omit({ patchKey: true });

export class BrainController {
  getCollectiveInsights = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const insights = await getCompositionRoot().globalBrain.getCollectiveInsights(tenantId);
      res.json({ insights });
    },
  ];

  getGlobalKnowledgeStatus = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const status = await getCompositionRoot().globalKnowledgeService.getStatus(tenantId);
      res.json(status);
    },
  ];

  listGlobalPatches = [
    requireOperator,
    async (req: Request, res: Response) => {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const patches = await getCompositionRoot().globalKnowledgeAdminService.listPatches(status);
      res.json({ patches });
    },
  ];

  createGlobalPatch = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const parsed = createPatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }
      const patch = await getCompositionRoot().globalKnowledgeAdminService.createPatch(
        parsed.data,
        req.actorId ?? req.userId
      );
      res.status(201).json({ patch });
    },
  ];

  updateGlobalPatch = [
    requireOperator,
    async (req: Request, res: Response) => {
      const parsed = updatePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }
      const patch = await getCompositionRoot().globalKnowledgeAdminService.updatePatch(
        req.params.id!,
        parsed.data
      );
      res.json({ patch });
    },
  ];

  publishGlobalPatch = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const patch = await getCompositionRoot().globalKnowledgeAdminService.publishPatch(
        req.params.id!,
        tenantId,
        req.actorId ?? req.userId
      );
      res.json({ patch });
    },
  ];

  retireGlobalPatch = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const patch = await getCompositionRoot().globalKnowledgeAdminService.retirePatch(
        req.params.id!,
        tenantId,
        req.actorId ?? req.userId
      );
      res.json({ patch });
    },
  ];

  getGlobalKnowledgeSyncHistory = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const history =
        await getCompositionRoot().globalKnowledgeAdminService.getSyncHistory(tenantId);
      res.json({ history });
    },
  ];

  listActiveGlobalPatches = [
    requireViewer,
    async (_req: Request, res: Response) => {
      const patches = await getCompositionRoot().globalKnowledgeAdminService.listPatches('active');
      res.json({
        patches: patches.slice(0, 10).map((p) => ({
          id: p.id,
          title: p.title,
          kind: p.kind,
          category: p.category,
          status: p.status,
          priority: p.priority,
        })),
      });
    },
  ];

  getContributionHistory = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const result = await getCompositionRoot().contributionHistoryService.getHistory(tenantId, {
        limit,
        offset,
      });
      res.json(result);
    },
  ];

  getContributionSummary = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const summary = await getCompositionRoot().contributionHistoryService.getSummary(tenantId);
      res.json(summary);
    },
  ];

  getLoRAAdapters = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const adapters = await getCompositionRoot().loraRegistry.list(tenantId);
      res.json({ adapters });
    },
  ];

  upsertLoRAAdapter = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const { adapterId, version, storagePath, traits, enabled } = req.body;
      if (!adapterId || !storagePath) {
        res.status(400).json({ error: 'adapterId and storagePath required' });
        return;
      }
      await getCompositionRoot().loraRegistry.register(tenantId, {
        adapterId: String(adapterId),
        version: String(version ?? '0.0.0'),
        storagePath: String(storagePath),
        traits: Array.isArray(traits) ? traits.map(String) : [],
        enabled: enabled !== false,
      });
      res.json({ success: true });
    },
  ];

  exportBrain = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const settings = await getMerchantSettings(tenantId);
      if (!settings.dataExportEnabled) {
        res.status(403).json({ error: 'Data export disabled for tenant' });
        return;
      }
      const bundle = await getCompositionRoot().brainMemoryService.exportBrain(tenantId);
      res.json(bundle);
    },
  ];

  importBrain = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const settings = await getMerchantSettings(tenantId);
      if (!settings.dataExportEnabled) {
        res.status(403).json({ error: 'Data export disabled for tenant' });
        return;
      }
      await getCompositionRoot().brainMemoryService.importBrain(tenantId, req.body);
      res.json({ success: true });
    },
  ];

  getMemorySummary = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const summary = await getCompositionRoot().managePersonalBrainMemory.getSummary(tenantId);
      res.json(summary);
    },
  ];

  listMemoryEntries = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const entries = await getCompositionRoot().managePersonalBrainMemory.listEntries(
        tenantId,
        kind as import('../../../../ai/intelligence/personal-brain/memory/types').MemoryKind | undefined,
        limit
      );
      res.json({ entries });
    },
  ];

  deleteMemoryEntry = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const result = await getCompositionRoot().managePersonalBrainMemory.deleteEntry(
        tenantId,
        req.params.id!
      );
      res.json(result);
    },
  ];

  clearShortTermMemory = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const result = await getCompositionRoot().managePersonalBrainMemory.clearShortTerm(tenantId);
      res.json(result);
    },
  ];

  consolidateMemory = [
    requireOperator,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const result = await getCompositionRoot().managePersonalBrainMemory.consolidate(tenantId);
      res.json(result);
    },
  ];

  getReflectionTimeline = [
    requireViewer,
    async (req: Request, res: Response) => {
      const tenantId = req.tenantId!;
      const result = await getCompositionRoot().getReflectionTimeline.execute({
        tenantId,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        agentKey: typeof req.query.agentKey === 'string' ? req.query.agentKey : undefined,
        includeHandoffs: req.query.includeHandoffs !== 'false',
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
      });
      res.json(result);
    },
  ];

  listReflectionExperiments = [
    requireOperator,
    async (_req: Request, res: Response) => {
      const experiments = await getCompositionRoot().manageReflectionExperiments.list();
      res.json({ experiments });
    },
  ];

  createReflectionExperiment = [
    requireOperator,
    async (req: Request, res: Response) => {
      const schema = z.object({
        name: z.string().min(1),
        bucketMin: z.number().int().min(0).max(99).optional(),
        bucketMax: z.number().int().min(0).max(99).optional(),
        variantConfig: z.record(z.unknown()),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }
      const experiment = await getCompositionRoot().manageReflectionExperiments.create({
        name: parsed.data.name,
        bucketMin: parsed.data.bucketMin,
        bucketMax: parsed.data.bucketMax,
        variantConfig: parsed.data.variantConfig as import('../../../../ai/intelligence/personal-brain/reflection/experiments/types').ReflectionVariantConfig,
      });
      res.status(201).json({ experiment });
    },
  ];

  stopReflectionExperiment = [
    requireOperator,
    async (req: Request, res: Response) => {
      const experiment = await getCompositionRoot().manageReflectionExperiments.stop(req.params.id!);
      res.json({ experiment });
    },
  ];

  getReflectionExperimentOutcomes = [
    requireOperator,
    async (req: Request, res: Response) => {
      const outcomes = await getCompositionRoot().manageReflectionExperiments.getOutcomes(
        req.params.id!
      );
      res.json({ outcomes });
    },
  ];
}
