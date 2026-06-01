CREATE TABLE IF NOT EXISTS "Experiment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Experiment_tenantId_metric_idx" ON "Experiment"("tenantId", "metric");

CREATE TABLE IF NOT EXISTS "ExperimentAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "treatedIds" TEXT NOT NULL,
    "controlIds" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExperimentAssignment_tenantId_metric_key" ON "ExperimentAssignment"("tenantId", "metric");
