import { getDataAdapter } from '../createDataAdapter';

export const negotiationsRepository = {
  list: () => getDataAdapter().fetchNegotiations(),
};
