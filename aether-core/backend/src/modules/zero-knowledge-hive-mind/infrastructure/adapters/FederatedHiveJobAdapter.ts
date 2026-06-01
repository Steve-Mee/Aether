import { FederatedHivePort } from '../../application/ports/FederatedHivePort';
import { runFederatedHiveJob } from '../jobs/FederatedHiveJob';

export class FederatedHiveJobAdapter implements FederatedHivePort {
  runBatch(tenantId: string) {
    return runFederatedHiveJob(tenantId);
  }
}

export const federatedHiveJobAdapter = new FederatedHiveJobAdapter();
