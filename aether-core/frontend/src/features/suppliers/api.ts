import { suppliersRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';

export const suppliersApi = {
  overview: () => suppliersRepository.overview(),
  detail: (id: string) => suppliersRepository.detail(id),
  patch: suppliersRepository.patch,
  monitor: suppliersRepository.monitor,
  create: suppliersRepository.create,
  fetchChanges: suppliersRepository.fetchChanges,
  queryKeys: queryKeys.suppliers,
};
