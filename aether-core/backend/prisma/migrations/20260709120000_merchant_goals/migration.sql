-- Merchant long-term goals
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "goalPrefs" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "ProactiveSuggestion" ADD COLUMN IF NOT EXISTS "goalId" TEXT;

CREATE TABLE IF NOT EXISTS "MerchantGoal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metricType" TEXT NOT NULL,
    "metricScope" JSONB NOT NULL DEFAULT '{}',
    "targetValue" DOUBLE PRECISION NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pursuitMode" TEXT NOT NULL DEFAULT 'balanced',
    "parentGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MerchantGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GoalProgressSnapshot" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "progressPct" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'periodic',

    CONSTRAINT "GoalProgressSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MerchantGoal_tenantId_status_idx" ON "MerchantGoal"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "MerchantGoal_tenantId_deadline_idx" ON "MerchantGoal"("tenantId", "deadline");
CREATE INDEX IF NOT EXISTS "GoalProgressSnapshot_goalId_recordedAt_idx" ON "GoalProgressSnapshot"("goalId", "recordedAt");
CREATE INDEX IF NOT EXISTS "ProactiveSuggestion_tenantId_goalId_status_idx" ON "ProactiveSuggestion"("tenantId", "goalId", "status");

ALTER TABLE "ProactiveSuggestion" ADD CONSTRAINT "ProactiveSuggestion_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "MerchantGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MerchantGoal" ADD CONSTRAINT "MerchantGoal_parentGoalId_fkey"
    FOREIGN KEY ("parentGoalId") REFERENCES "MerchantGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GoalProgressSnapshot" ADD CONSTRAINT "GoalProgressSnapshot_goalId_fkey"
    FOREIGN KEY ("goalId") REFERENCES "MerchantGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
