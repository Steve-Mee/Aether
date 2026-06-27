/**
 * @deprecated Use PersonalBrainToolRegistry — kept for backward-compatible imports in tests.
 */
export {
  PersonalBrainToolRegistry as BrainToolRegistry,
  type BrainToolDefinition,
} from '../personal-brain/tools/PersonalBrainToolRegistry';

export type {
  BrainToolCall,
  BrainToolContext,
  BrainToolTraceEntry as BrainToolResult,
  ToolProposal,
} from '../personal-brain/tools/types';

export const BRAIN_TOOL_SCHEMA = '(dynamic — use registry.getSchemaPrompt())';
