-- CreateTable
CREATE TABLE "AgentExplainabilitySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "rootRunId" TEXT,
    "detailLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentExplainabilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "explainabilityPrefs" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "AgentExplainabilitySnapshot_tenantId_sourceType_sourceId_key" ON "AgentExplainabilitySnapshot"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AgentExplainabilitySnapshot_tenantId_rootRunId_idx" ON "AgentExplainabilitySnapshot"("tenantId", "rootRunId");

-- CreateIndex
CREATE INDEX "AgentExplainabilitySnapshot_tenantId_createdAt_idx" ON "AgentExplainabilitySnapshot"("tenantId", "createdAt");
