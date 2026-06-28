import type { ProcessCommandInput, ProcessCommandOutput } from './types';

export interface AgentRuntimePort {
  processCommand(input: ProcessCommandInput): Promise<ProcessCommandOutput>;
}
