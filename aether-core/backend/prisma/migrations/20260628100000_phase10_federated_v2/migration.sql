-- Phase 10: federated v2 audit fields, pattern tenant contributions, deployment registry

ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "brainFederatedExecutionContribute" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FederatedExecutionAudit" ADD COLUMN IF NOT EXISTS "sourceDeploymentId" TEXT;
ALTER TABLE "FederatedExecutionAudit" ADD COLUMN IF NOT EXISTS "targetDeploymentId" TEXT;
ALTER TABLE "FederatedExecutionAudit" ADD COLUMN IF NOT EXISTS "remoteExecutionRef" TEXT;
ALTER TABLE "FederatedExecutionAudit" ADD COLUMN IF NOT EXISTS "responseLatencyMs" INTEGER;
ALTER TABLE "FederatedExecutionAudit" ADD COLUMN IF NOT EXISTS "queryHintHash" TEXT;

CREATE TABLE IF NOT EXISTS "AgentPatternTenantContribution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentPatternTenantContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentPatternTenantContribution_tenantId_category_agentKey_patternType_key"
ON "AgentPatternTenantContribution"("tenantId", "category", "agentKey", "patternType");

CREATE INDEX IF NOT EXISTS "AgentPatternTenantContribution_category_agentKey_patternType_idx"
ON "AgentPatternTenantContribution"("category", "agentKey", "patternType");

CREATE TABLE IF NOT EXISTS "FederatedDeploymentRegistry" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "baseUrl" TEXT,
    "publicKey" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FederatedDeploymentRegistry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FederatedDeploymentRegistry_deploymentId_key"
ON "FederatedDeploymentRegistry"("deploymentId");
