-- Phase 8: async peer delegation job queue
CREATE TABLE "AgentPeerJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentRunId" TEXT,
    "sourceAgentKey" TEXT NOT NULL,
    "targetAgentKey" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultPayload" TEXT,
    "error" TEXT,
    "idempotencyKey" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentPeerJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentPeerJob_idempotencyKey_key" ON "AgentPeerJob"("idempotencyKey");
CREATE INDEX "AgentPeerJob_tenantId_status_idx" ON "AgentPeerJob"("tenantId", "status");
CREATE INDEX "AgentPeerJob_tenantId_parentRunId_idx" ON "AgentPeerJob"("tenantId", "parentRunId");
