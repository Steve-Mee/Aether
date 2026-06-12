import { getDataAdapter } from '../createDataAdapter';

export const commandsRepository = {
  execute: (command: string) => getDataAdapter().executeCommand(command),
  undo: (commandId: string) => getDataAdapter().undoCommand(commandId),
  history: () => getDataAdapter().fetchCommandHistory(),
};
