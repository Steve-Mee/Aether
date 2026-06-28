import type { MerchantSettings } from '../../../shared/settings/merchantSettingsTypes';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import type { KnowledgeTransferGatePort } from '../knowledge-transfer/KnowledgeTransferGatePort';
import type { LoRAAdapterRegistryPort } from '../personal-brain/LoRAAdapterRegistryPort';
import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import type { GlobalKnowledgePort } from './GlobalKnowledgePort';
import { DEFAULT_BRAIN_AGENT_KEY } from './constants';
import { GlobalKnowledgeExperimentService } from './experiments/GlobalKnowledgeExperimentService';
import { GlobalKnowledgePatchRepository } from './GlobalKnowledgePatchRepository';
import {
  filterPatchesByProfile,
  formatGlobalKnowledgeContent,
  formatGlobalPatchSnippet,
  globalKnowledgeDocId,
} from './globalKnowledgeUtils';
import type {
  GlobalKnowledgeContextMeta,
  GlobalKnowledgeStatusDto,
  GlobalKnowledgeSyncResult,
  KnowledgePatch,
  UpdateProfile,
} from './types';
import { SYNC_TTL_MS } from './types';

export type MerchantSettingsLoader = (tenantId: string) => Promise<MerchantSettings>;

export class GlobalKnowledgeService {
  private activePatches = new Map<string, KnowledgePatch[]>();

  constructor(
    private globalKnowledgePort: GlobalKnowledgePort,
    private personalBrains: PersonalBrainRegistry,
    private ktGate: KnowledgeTransferGatePort,
    private loadSettings: MerchantSettingsLoader = getMerchantSettings,
    private patchRepo = new GlobalKnowledgePatchRepository(),
    private loraRegistry?: LoRAAdapterRegistryPort,
    private experimentService = new GlobalKnowledgeExperimentService()
  ) {}

  async syncForTenant(
    tenantId: string,
    agentKey = DEFAULT_BRAIN_AGENT_KEY
  ): Promise<GlobalKnowledgeSyncResult> {
    const empty: GlobalKnowledgeSyncResult = {
      applied: 0,
      skipped: 0,
      retired: 0,
      catalogVersion: this.globalKnowledgePort.getCatalogVersion(),
      patches: [],
      synced: false,
    };

    if (!(await this.ktGate.isEnabled(tenantId))) {
      this.activePatches.delete(`${tenantId}:${agentKey}`);
      return empty;
    }

    const settings = await this.loadSettings(tenantId);
    if (settings.brainKnowledgeGovernanceMode === 'contribute_only') {
      return empty;
    }

    const baseProfile = resolveUpdateProfile(settings);
    let profile = baseProfile;
    let allowedPatchIds: Set<string> | null = null;
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 === 'true') {
      const experiment = await this.experimentService.resolveProfileOverride(tenantId, baseProfile);
      profile = experiment.profile;
      allowedPatchIds = experiment.allowedPatchIds;
    }
    const catalogVersion = this.globalKnowledgePort.getCatalogVersion();
    const brain = this.personalBrains.get(tenantId, agentKey);
    const brainContext = await brain.getContext();

    const needsSync =
      brainContext.appliedGlobalKnowledgeVersion !== catalogVersion ||
      !brainContext.lastGlobalKnowledgeSyncAt ||
      Date.now() - Date.parse(brainContext.lastGlobalKnowledgeSyncAt) > SYNC_TTL_MS;

    let allPatches = await this.globalKnowledgePort.listPatches(tenantId);
    if (allowedPatchIds) {
      allPatches = allPatches.filter((p) => allowedPatchIds.has(p.id));
    }
    const patches = filterPatchesByProfile(allPatches, profile);

    if (!needsSync) {
      this.activePatches.set(`${tenantId}:${agentKey}`, patches);
      return { ...empty, patches, synced: false, skipped: patches.length };
    }

    const previousIds = new Set(brainContext.appliedGlobalPatchIds ?? []);
    const nextIds = new Set(patches.map((p) => p.id));
    let retired = 0;

    for (const oldId of previousIds) {
      if (!nextIds.has(oldId)) {
        try {
          await brain.forgetMemory(globalKnowledgeDocId(oldId));
          retired++;
        } catch {
          // best-effort
        }
      }
    }

    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 === 'true') {
      const retiredKeys = await this.patchRepo.listRetiredPatchKeys();
      for (const key of retiredKeys) {
        if (previousIds.has(key)) {
          try {
            await brain.forgetMemory(globalKnowledgeDocId(key));
            retired++;
          } catch {
            // best-effort
          }
        }
      }
    }

    let applied = 0;
    for (const patch of patches) {
      await this.applyPatch(tenantId, agentKey, patch, catalogVersion);
      applied++;
    }

    await brain.updateAgentState({
      appliedGlobalKnowledgeVersion: catalogVersion,
      lastGlobalKnowledgeSyncAt: new Date().toISOString(),
      appliedGlobalPatchIds: [...nextIds],
    });

    this.activePatches.set(`${tenantId}:${agentKey}`, patches);

    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 === 'true') {
      await this.patchRepo.logSync({
        tenantId,
        catalogVersion,
        appliedCount: applied,
        retiredCount: retired,
        profile,
      });
    }

    return {
      applied,
      skipped: 0,
      retired,
      catalogVersion,
      patches,
      synced: true,
    };
  }

  private async applyPatch(
    tenantId: string,
    agentKey: string,
    patch: KnowledgePatch,
    catalogVersion: string
  ): Promise<void> {
    const brain = this.personalBrains.get(tenantId, agentKey);

    if (patch.kind === 'lora_trait' || patch.kind === 'lora_config') {
      if (this.loraRegistry && patch.payload) {
        const traits = Array.isArray(patch.payload.traits)
          ? patch.payload.traits.map(String)
          : [patch.content];
        await this.loraRegistry.register(tenantId, {
          adapterId: String(patch.payload.adapterId ?? 'global-default'),
          version: patch.version,
          storagePath: String(patch.payload.storagePath ?? `/data/lora/${tenantId}`),
          traits,
          enabled: true,
        });
      }
      return;
    }

    const content =
      patch.kind === 'vector_distilled' && patch.payload?.embeddingText
        ? String(patch.payload.embeddingText)
        : formatGlobalKnowledgeContent(patch);

    await brain.indexKnowledge({
      id: globalKnowledgeDocId(patch.id),
      content,
      metadata: {
        source: patch.kind === 'vector_distilled' ? 'global_distilled' : 'global',
        kind: patch.kind,
        category: patch.category,
        catalogVersion,
        patchVersion: patch.version,
        title: patch.title,
      },
    });
  }

  getActivePatches(tenantId: string, agentKey = DEFAULT_BRAIN_AGENT_KEY): KnowledgePatch[] {
    return this.activePatches.get(`${tenantId}:${agentKey}`) ?? [];
  }

  async getActiveContextSnippets(
    tenantId: string,
    agentKey = DEFAULT_BRAIN_AGENT_KEY
  ): Promise<string[]> {
    const patches = this.getActivePatches(tenantId, agentKey);
    if (patches.length === 0 && (await this.ktGate.isEnabled(tenantId))) {
      const sync = await this.syncForTenant(tenantId, agentKey);
      return sync.patches.map(formatGlobalPatchSnippet);
    }
    return patches.map(formatGlobalPatchSnippet);
  }

  getTopPatchesForRetrieval(
    tenantId: string,
    agentKey = DEFAULT_BRAIN_AGENT_KEY,
    limit = 3
  ): KnowledgePatch[] {
    return [...this.getActivePatches(tenantId, agentKey)]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  async getStatus(tenantId: string): Promise<GlobalKnowledgeStatusDto> {
    const settings = await this.loadSettings(tenantId);
    const ktEnabled = await this.ktGate.isEnabled(tenantId);
    const log = await this.patchRepo.getLatestSyncLog(tenantId);
    const brain = this.personalBrains.get(tenantId, DEFAULT_BRAIN_AGENT_KEY);
    const ctx = await brain.getContext();

    return {
      catalogVersion: this.globalKnowledgePort.getCatalogVersion(),
      lastSyncAt: log?.syncedAt.toISOString() ?? ctx.lastGlobalKnowledgeSyncAt ?? null,
      appliedPatchCount: ctx.appliedGlobalPatchIds?.length ?? 0,
      activeProfile: resolveUpdateProfile(settings),
      ktEnabled,
    };
  }

  buildContextMeta(syncResult: GlobalKnowledgeSyncResult): GlobalKnowledgeContextMeta | undefined {
    if (!syncResult.synced || syncResult.applied === 0) return undefined;
    return {
      synced: true,
      appliedCount: syncResult.applied,
      catalogVersion: syncResult.catalogVersion,
      message: `Het brein heeft ${syncResult.applied} algemene patronen van andere merchants toegepast.`,
    };
  }

  getExperimentService(): GlobalKnowledgeExperimentService {
    return this.experimentService;
  }

  getPatchRepository(): GlobalKnowledgePatchRepository {
    return this.patchRepo;
  }
}

export function resolveUpdateProfile(
  settings: Pick<MerchantSettings, 'brainKnowledgeUpdateProfile'>
): UpdateProfile {
  const profile = settings.brainKnowledgeUpdateProfile;
  if (profile === 'conservative' || profile === 'aggressive') return profile;
  return 'balanced';
}
