-- Goals v2: suggestions, priority weight, federated patterns
ALTER TABLE "MerchantGoal" ADD COLUMN IF NOT EXISTS "priorityWeight" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "GoalSuggestion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "metricType" TEXT NOT NULL,
  "metricScope" JSONB NOT NULL DEFAULT '{}',
  "suggestedTarget" DOUBLE PRECISION NOT NULL,
  "suggestedBaseline" DOUBLE PRECISION NOT NULL,
  "suggestedDeadline" TIMESTAMP(3) NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "rationale" TEXT NOT NULL,
  "evidence" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoalSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoalSuggestion_tenantId_dedupeKey_key" ON "GoalSuggestion"("tenantId", "dedupeKey");
CREATE INDEX IF NOT EXISTS "GoalSuggestion_tenantId_status_idx" ON "GoalSuggestion"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "GlobalGoalPattern" (
  "id" TEXT NOT NULL,
  "patternKey" TEXT NOT NULL,
  "metricType" TEXT NOT NULL,
  "pursuitMode" TEXT,
  "completionRate" DOUBLE PRECISION NOT NULL,
  "avgDaysToComplete" DOUBLE PRECISION,
  "driftRecoveryRate" DOUBLE PRECISION,
  "tenantCount" INTEGER NOT NULL DEFAULT 0,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "kAnonymityMet" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalGoalPattern_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GlobalGoalPattern_patternKey_key" ON "GlobalGoalPattern"("patternKey");

CREATE TABLE IF NOT EXISTS "GoalPatternContribution" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patternKey" TEXT NOT NULL,
  "sampleCount" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "GoalPatternContribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoalPatternContribution_tenantId_patternKey_key" ON "GoalPatternContribution"("tenantId", "patternKey");
