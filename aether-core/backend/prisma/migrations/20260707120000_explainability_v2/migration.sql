-- AlterTable
ALTER TABLE "AgentExplainabilitySnapshot" ADD COLUMN "summarySource" TEXT NOT NULL DEFAULT 'template';
ALTER TABLE "AgentExplainabilitySnapshot" ADD COLUMN "llmSummaryAt" TIMESTAMP(3);
ALTER TABLE "AgentExplainabilitySnapshot" ADD COLUMN "agentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AgentExplainabilitySnapshot" ADD COLUMN "intentId" TEXT;
ALTER TABLE "AgentExplainabilitySnapshot" ADD COLUMN "triggerId" TEXT;
ALTER TABLE "AgentExplainabilitySnapshot" ADD COLUMN "flowGraph" JSONB;

-- CreateIndex
CREATE INDEX "AgentExplainabilitySnapshot_tenantId_intentId_idx" ON "AgentExplainabilitySnapshot"("tenantId", "intentId");

-- CreateIndex
CREATE INDEX "AgentExplainabilitySnapshot_tenantId_triggerId_idx" ON "AgentExplainabilitySnapshot"("tenantId", "triggerId");
