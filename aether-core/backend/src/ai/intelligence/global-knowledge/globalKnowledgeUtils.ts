import type { KnowledgePatch, UpdateProfile } from './types';
import { UPDATE_PROFILE_RANK } from './types';

export function filterPatchesByProfile(
  patches: KnowledgePatch[],
  profile: UpdateProfile
): KnowledgePatch[] {
  const profileRank = UPDATE_PROFILE_RANK[profile];

  return patches.filter((patch) => {
    if (UPDATE_PROFILE_RANK[patch.minProfile] > profileRank) {
      return false;
    }

    switch (profile) {
      case 'conservative':
        if (patch.kind === 'prompt_template' || patch.kind === 'lora_config') return false;
        if (patch.kind === 'pattern' || patch.kind === 'metric_insight' || patch.kind === 'lora_trait') {
          return patch.priority >= 8;
        }
        if (patch.kind === 'vector_distilled') return patch.priority >= 9;
        return patch.kind === 'optimization_rule' && patch.priority >= 8;

      case 'balanced':
        if (patch.kind === 'prompt_template' && patch.priority < 5) return false;
        if (patch.kind === 'lora_config' && patch.priority < 7) return false;
        return true;

      case 'aggressive':
        return true;

      default:
        return true;
    }
  });
}

export function formatGlobalPatchSnippet(patch: KnowledgePatch): string {
  return `[global:${patch.kind}] ${patch.title}: ${patch.content}`;
}

export function formatMerchantCollectiveSnippet(category: string, summary: string): string {
  return `[collective:${category}] ${summary}`;
}

export function globalKnowledgeDocId(patchId: string): string {
  return `global:${patchId}`;
}

export function formatGlobalKnowledgeContent(patch: KnowledgePatch): string {
  return `[GLOBAL_KNOWLEDGE:${patch.kind}] ${patch.title}: ${patch.content}`;
}
