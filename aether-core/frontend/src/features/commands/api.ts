import { commandsRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';

export const commandsApi = {
  execute: (command: string) => commandsRepository.execute(command),
  undo: (commandId: string) => commandsRepository.undo(commandId),
  history: () => commandsRepository.history(),
  queryKeys: queryKeys.commands,
};
