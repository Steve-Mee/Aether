import { getDataAdapter } from '../createDataAdapter';

export const commandsRepository = {
  execute: (command: string) => getDataAdapter().executeCommand(command),
  undo: (commandId: string) => getDataAdapter().undoCommand(commandId),
  executeToolProposal: (proposalId: string, commandId?: string) =>
    getDataAdapter().executeToolProposal(proposalId, commandId),
  rejectToolProposal: (proposalId: string) => getDataAdapter().rejectToolProposal(proposalId),
  history: () => getDataAdapter().fetchCommandHistory(),
  agentRun: (commandId: string) => getDataAdapter().fetchAgentRun(commandId),
};
