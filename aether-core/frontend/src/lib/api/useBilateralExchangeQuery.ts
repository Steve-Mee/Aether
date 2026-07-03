import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiRoutes } from '@/lib/api';
import type {
  BilateralContractDto,
  BilateralPackageDto,
  BilateralSchemaDto,
  ProposeBilateralContractInput,
} from '@/lib/bilateral/types';

const keys = {
  schemas: ['bilateral-schemas'] as const,
  contracts: ['bilateral-contracts'] as const,
  packages: (contractId: string) => ['bilateral-packages', contractId] as const,
};

export function useBilateralSchemasQuery(enabled = true) {
  return useQuery({
    queryKey: keys.schemas,
    queryFn: () => apiFetch<{ schemas: BilateralSchemaDto[] }>(apiRoutes.bilateral.schemas),
    enabled,
  });
}

export function useBilateralContractsQuery(enabled = true) {
  return useQuery({
    queryKey: keys.contracts,
    queryFn: () => apiFetch<{ contracts: BilateralContractDto[] }>(apiRoutes.bilateral.contracts),
    enabled,
  });
}

export function useBilateralPackagesQuery(contractId: string | null, enabled = true) {
  return useQuery({
    queryKey: keys.packages(contractId ?? ''),
    queryFn: () =>
      apiFetch<{ packages: BilateralPackageDto[] }>(
        apiRoutes.bilateral.contractPackages(contractId!),
      ),
    enabled: enabled && Boolean(contractId),
  });
}

export function useProposeBilateralContractMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProposeBilateralContractInput) =>
      apiFetch<BilateralContractDto>(apiRoutes.bilateral.contracts, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.contracts }),
  });
}

export function useAcceptBilateralContractMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      apiFetch<BilateralContractDto>(apiRoutes.bilateral.contractAccept(contractId), {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.contracts }),
  });
}

export function useRevokeBilateralContractMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      apiFetch(apiRoutes.bilateral.contractRevoke(contractId), { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.contracts }),
  });
}

export function usePublishBilateralPackageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      apiFetch<BilateralPackageDto>(apiRoutes.bilateral.publishPackage, {
        method: 'POST',
        body: JSON.stringify({ contractId }),
      }),
    onSuccess: (_data, contractId) => {
      void qc.invalidateQueries({ queryKey: keys.contracts });
      void qc.invalidateQueries({ queryKey: keys.packages(contractId) });
    },
  });
}

export function useConsumeBilateralPackageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, contractId }: { packageId: string; contractId: string }) =>
      apiFetch<{ packageId: string; fields: string[] }>(apiRoutes.bilateral.consumePackage, {
        method: 'POST',
        body: JSON.stringify({ packageId }),
      }).then((result) => ({ ...result, contractId })),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: keys.contracts });
      void qc.invalidateQueries({ queryKey: keys.packages(result.contractId) });
    },
  });
}
