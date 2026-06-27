export interface FederatedAgentRequest {
  requestId: string;
  sourceDeploymentId: string;
  targetDeploymentId: string;
  targetTenantId: string;
  sourceTenantId: string;
  sourceAgentKey: string;
  capability: string;
  /** SHA-256 of query hint — plaintext never crosses deployments */
  queryHintHash?: string;
  signature: string;
  expiresAt: string;
}

export interface FederatedAgentResponse {
  requestId: string;
  sourceDeploymentId: string;
  targetDeploymentId: string;
  success: boolean;
  summary?: string;
  summaryHash?: string;
  error?: string;
  remoteExecutionRef?: string;
  signature: string;
}

export interface FederatedDeploymentEntry {
  deploymentId: string;
  baseUrl?: string;
  publicKey?: string;
  capabilities: string[];
  status: 'active' | 'inactive';
}
