import type { ExperienceReflection } from '../reflection/types';
import type { MemoryKind, MemoryPriority } from './types';

export interface ReflectionMemoryMatch {
  id: string;
  content: string;
  score: number;
  summary: string;
  timestamp?: string;
  kind: MemoryKind;
  priority?: MemoryPriority;
  reflectionPayload?: ExperienceReflection;
  consolidatedAt?: string;
}
