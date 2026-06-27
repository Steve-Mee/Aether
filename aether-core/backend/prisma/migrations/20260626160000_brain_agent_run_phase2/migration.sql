-- Phase 2: agent run transcript + approval link on proposals
CREATE TABLE IF NOT EXISTS "BrainAgentRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commandId" TEXT,
    "transcript" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrainAgentRun_tenantId_commandId_idx" ON "BrainAgentRun"("tenantId", "commandId");

ALTER TABLE "BrainToolProposal" ADD COLUMN IF NOT EXISTS "approvalId" TEXT;

CREATE INDEX IF NOT EXISTS "BrainToolProposal_approvalId_idx" ON "BrainToolProposal"("approvalId");

ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "brainAdaptiveAutoExecuteEnabled" BOOLEAN NOT NULL DEFAULT false;
