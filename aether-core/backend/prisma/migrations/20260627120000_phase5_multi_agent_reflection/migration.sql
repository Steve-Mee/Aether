-- Phase 5: multi-agent delegation, reflection experiments, handoff log

ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "agentKey" TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "parentRunId" TEXT;
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "delegationId" TEXT;
ALTER TABLE "BrainAgentRun" ADD COLUMN IF NOT EXISTS "delegationMeta" JSONB;

CREATE INDEX IF NOT EXISTS "BrainAgentRun_tenantId_parentRunId_idx" ON "BrainAgentRun"("tenantId", "parentRunId");
CREATE INDEX IF NOT EXISTS "BrainAgentRun_tenantId_delegationId_idx" ON "BrainAgentRun"("tenantId", "delegationId");

CREATE TABLE IF NOT EXISTS "ReflectionHandoffLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceAgentKey" TEXT NOT NULL,
    "targetAgentKey" TEXT NOT NULL,
    "reflectionIds" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "delegationId" TEXT,
    "parentRunId" TEXT,
    "childRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReflectionHandoffLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReflectionHandoffLog_tenantId_createdAt_idx" ON "ReflectionHandoffLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReflectionHandoffLog_tenantId_sourceAgentKey_idx" ON "ReflectionHandoffLog"("tenantId", "sourceAgentKey");

CREATE TABLE IF NOT EXISTS "ReflectionExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "bucketMin" INTEGER NOT NULL DEFAULT 0,
    "bucketMax" INTEGER NOT NULL DEFAULT 49,
    "variantConfig" JSONB NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReflectionExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReflectionExperimentOutcome" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "variantArm" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReflectionExperimentOutcome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReflectionExperimentOutcome_experimentId_tenantId_idx" ON "ReflectionExperimentOutcome"("experimentId", "tenantId");
CREATE INDEX IF NOT EXISTS "ReflectionExperimentOutcome_experimentId_metric_idx" ON "ReflectionExperimentOutcome"("experimentId", "metric");

ALTER TABLE "ReflectionExperimentOutcome" ADD CONSTRAINT "ReflectionExperimentOutcome_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ReflectionExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
