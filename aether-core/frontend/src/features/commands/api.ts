import { commandsRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';

export const commandsApi = {
  execute: (command: string) => commandsRepository.execute(command),
  undo: (commandId: string) => commandsRepository.undo(commandId),
  executeToolProposal: (proposalId: string, commandId?: string) =>
    commandsRepository.executeToolProposal(proposalId, commandId),
  rejectToolProposal: (proposalId: string) => commandsRepository.rejectToolProposal(proposalId),
  history: () => commandsRepository.history(),
  agentRun: (commandId: string) => commandsRepository.agentRun(commandId),
  queryKeys: queryKeys.commands,
};
