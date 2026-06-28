import { getDataAdapter } from '../createDataAdapter';

export const autonomousRepository = {
  list: () => getDataAdapter().fetchAutonomousDecisions(),
};
