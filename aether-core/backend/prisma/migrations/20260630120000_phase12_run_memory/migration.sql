-- Phase 12a: Run-scoped working memory (blackboard)
CREATE TABLE "RunWorkingMemory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedByAgentKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunWorkingMemory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RunWorkingMemory_tenantId_runId_namespace_key_key" ON "RunWorkingMemory"("tenantId", "runId", "namespace", "key");
CREATE INDEX "RunWorkingMemory_tenantId_runId_idx" ON "RunWorkingMemory"("tenantId", "runId");

-- Phase 12b: Async peer job notify + contextPayload
ALTER TABLE "AgentPeerJob" ADD COLUMN IF NOT EXISTS "messageType" TEXT;
ALTER TABLE "AgentPeerJob" ADD COLUMN IF NOT EXISTS "contextPayload" JSONB;
ALTER TABLE "AgentPeerJob" ADD COLUMN IF NOT EXISTS "jobMode" TEXT NOT NULL DEFAULT 'handoff';
