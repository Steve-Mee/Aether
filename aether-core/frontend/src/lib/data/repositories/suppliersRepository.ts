import { getDataAdapter } from '../createDataAdapter';

export const suppliersRepository = {
  overview: () => getDataAdapter().fetchSuppliersOverview(),
  detail: (id: string) => getDataAdapter().fetchSupplierDetail(id),
  patch: (id: string, patch: Partial<{ autoSyncEnabled: boolean; status: string }>) =>
    getDataAdapter().patchSupplier(id, patch),
  monitor: (id: string) => getDataAdapter().monitorSupplier(id),
  create: (body: { name: string; website: string }) => getDataAdapter().createSupplier(body),
  fetchChanges: (status?: string) => getDataAdapter().fetchSupplierChanges(status),
};
