import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiRoutes } from '@/lib/api';

export interface FederatedDeployment {
  deploymentId: string;
  baseUrl?: string;
  publicKey?: string;
  capabilities: string[];
  status: 'active' | 'inactive';
  source: 'env' | 'db';
}

export interface FederatedStatus {
  localDeploymentId: string;
  federatedRpcEnabled: boolean;
  messageBroker: string;
  relayBacklog: number;
  unprocessedEvents: number;
}

export function useFederatedDeploymentsQuery() {
  return useQuery({
    queryKey: ['federated-deployments'],
    queryFn: () =>
      apiFetch<{ deployments: FederatedDeployment[]; capabilityCatalog: string[] }>(
        apiRoutes.admin.federatedDeployments
      ),
  });
}

export function useFederatedStatusQuery() {
  return useQuery({
    queryKey: ['federated-status'],
    queryFn: () => apiFetch<FederatedStatus>(apiRoutes.admin.federatedDeploymentsStatus),
  });
}

export function useCreateFederatedDeploymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<FederatedDeployment, 'source'>) =>
      apiFetch(apiRoutes.admin.federatedDeployments, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['federated-deployments'] }),
  });
}

export function useUpdateFederatedDeploymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deploymentId, ...body }: Partial<FederatedDeployment> & { deploymentId: string }) =>
      apiFetch(apiRoutes.admin.federatedDeployment(deploymentId), {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['federated-deployments'] }),
  });
}

export function useDeactivateFederatedDeploymentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deploymentId: string) =>
      apiFetch(apiRoutes.admin.federatedDeployment(deploymentId), { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['federated-deployments'] }),
  });
}
