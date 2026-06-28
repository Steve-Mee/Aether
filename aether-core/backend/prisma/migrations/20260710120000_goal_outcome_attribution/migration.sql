-- Goal outcome attribution fields on OutcomeRecord
ALTER TABLE "OutcomeRecord" ADD COLUMN IF NOT EXISTS "goalId" TEXT;
ALTER TABLE "OutcomeRecord" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "OutcomeRecord" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "OutcomeRecord" ADD COLUMN IF NOT EXISTS "rootRunId" TEXT;
CREATE INDEX IF NOT EXISTS "OutcomeRecord_tenantId_goalId_idx" ON "OutcomeRecord"("tenantId", "goalId");
