export type KnowledgePatchKind =
  | 'pattern'
  | 'prompt_template'
  | 'optimization_rule'
  | 'metric_insight'
  | 'lora_trait'
  | 'lora_config'
  | 'vector_distilled';

export type UpdateProfile = 'conservative' | 'balanced' | 'aggressive';

export type KnowledgeGovernanceMode = 'contribute_only' | 'receive_only' | 'full_loop';

export type GlobalKnowledgePatchStatus = 'draft' | 'active' | 'retired';

export interface KnowledgePatch {
  id: string;
  version: string;
  kind: KnowledgePatchKind;
  category: string;
  title: string;
  content: string;
  priority: number;
  minProfile: UpdateProfile;
  tags?: string[];
  payload?: Record<string, unknown>;
}

export interface GlobalKnowledgeSyncResult {
  applied: number;
  skipped: number;
  retired: number;
  catalogVersion: string;
  patches: KnowledgePatch[];
  synced: boolean;
}

export interface GlobalKnowledgeContextMeta {
  synced: boolean;
  appliedCount: number;
  catalogVersion: string;
  message?: string;
}

export interface GlobalKnowledgeStatusDto {
  catalogVersion: string;
  lastSyncAt: string | null;
  appliedPatchCount: number;
  activeProfile: UpdateProfile;
  ktEnabled: boolean;
}

export const UPDATE_PROFILE_RANK: Record<UpdateProfile, number> = {
  conservative: 0,
  balanced: 1,
  aggressive: 2,
};

export const SYNC_TTL_MS = 60 * 60 * 1000;

export const FEDERATED_MIN_TENANTS = 5;
export const FEDERATED_MIN_SAMPLES = 10;
export const LAPLACE_EPSILON = 0.5;
