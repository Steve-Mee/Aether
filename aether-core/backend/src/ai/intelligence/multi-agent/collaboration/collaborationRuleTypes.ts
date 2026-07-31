import type { CollaborationChainStep } from '../types';

export interface CollaborationRule {
  id: string;
  trigger: {
    intents?: string[];
    excludeIntents?: string[];
    commandPattern?: RegExp;
    requireKeywordAgents?: string[];
  };
  chain: CollaborationChainStep[];
  mode: 'prepend' | 'sequential' | 'parallel';
}
