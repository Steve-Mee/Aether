-- BrainAgentRun checkpoint fields for multi-step approval pause/resume
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "currentStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "totalSteps" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "pendingApprovalId" TEXT;
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "pendingProposalId" TEXT;
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "resumeContext" TEXT;

CREATE INDEX IF NOT EXISTS "BrainAgentRun_tenantId_pendingApprovalId_idx"
  ON "BrainAgentRun"("tenantId", "pendingApprovalId");
