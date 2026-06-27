-- Global knowledge v2-v4 schema

ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "brainFederatedContributionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "brainKnowledgeGovernanceMode" TEXT NOT NULL DEFAULT 'full_loop';

CREATE TABLE IF NOT EXISTS "GlobalKnowledgePatch" (
  "id" TEXT NOT NULL,
  "patchKey" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "kind" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 5,
  "minProfile" TEXT NOT NULL DEFAULT 'balanced',
  "tags" JSONB NOT NULL DEFAULT '[]',
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "publishedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalKnowledgePatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GlobalKnowledgePatch_patchKey_key" ON "GlobalKnowledgePatch"("patchKey");
CREATE INDEX IF NOT EXISTS "GlobalKnowledgePatch_status_idx" ON "GlobalKnowledgePatch"("status");
CREATE INDEX IF NOT EXISTS "GlobalKnowledgePatch_category_idx" ON "GlobalKnowledgePatch"("category");

CREATE TABLE IF NOT EXISTS "GlobalInsight" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "tenantCount" INTEGER NOT NULL,
  "noiseEpsilon" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalInsight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GlobalInsight_category_metric_key" ON "GlobalInsight"("category", "metric");
CREATE INDEX IF NOT EXISTS "GlobalInsight_category_idx" ON "GlobalInsight"("category");

CREATE TABLE IF NOT EXISTS "GlobalKnowledgeSyncLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "catalogVersion" TEXT NOT NULL,
  "appliedCount" INTEGER NOT NULL,
  "retiredCount" INTEGER NOT NULL DEFAULT 0,
  "profile" TEXT NOT NULL,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalKnowledgeSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GlobalKnowledgeSyncLog_tenantId_syncedAt_idx" ON "GlobalKnowledgeSyncLog"("tenantId", "syncedAt");

CREATE TABLE IF NOT EXISTS "GlobalKnowledgeExperiment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "profileArm" TEXT NOT NULL,
  "patchSetKeys" JSONB,
  "bucketMin" INTEGER NOT NULL DEFAULT 0,
  "bucketMax" INTEGER NOT NULL DEFAULT 49,
  "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'running',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalKnowledgeExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GlobalKnowledgeExperimentOutcome" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalKnowledgeExperimentOutcome_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GlobalKnowledgeExperimentOutcome_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "GlobalKnowledgeExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GlobalKnowledgeExperimentOutcome_experimentId_tenantId_idx" ON "GlobalKnowledgeExperimentOutcome"("experimentId", "tenantId");
