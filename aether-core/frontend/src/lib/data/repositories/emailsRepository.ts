import { getDataAdapter } from '../createDataAdapter';

export const emailsRepository = {
  list: () => getDataAdapter().fetchEmails(),
  detail: (id: string) => getDataAdapter().fetchEmailDetail(id),
};
