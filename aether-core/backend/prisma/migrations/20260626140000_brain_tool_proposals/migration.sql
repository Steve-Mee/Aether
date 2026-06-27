-- Brain tool proposals + merchant brain action settings
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "brainActionMode" TEXT NOT NULL DEFAULT 'confirm_on_uncertain';
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "brainAdaptiveLearningEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "BrainToolProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "commandId" TEXT,
    "tool" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainToolProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrainToolProposal_tenantId_status_idx" ON "BrainToolProposal"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "BrainToolProposal_commandId_idx" ON "BrainToolProposal"("commandId");
