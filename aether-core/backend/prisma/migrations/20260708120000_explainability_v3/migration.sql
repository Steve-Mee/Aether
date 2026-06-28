-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "brainExplainabilityFederateEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ExplainabilityPatternContribution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplainabilityPatternContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalExplainabilityPattern" (
    "id" TEXT NOT NULL,
    "patternKey" TEXT NOT NULL,
    "agentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggerId" TEXT,
    "intentId" TEXT,
    "sourceType" TEXT NOT NULL,
    "summaryTemplate" TEXT NOT NULL,
    "tenantCount" INTEGER NOT NULL DEFAULT 0,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "kAnonymityMet" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalExplainabilityPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExplainabilityPatternContribution_tenantId_patternKey_key" ON "ExplainabilityPatternContribution"("tenantId", "patternKey");

-- CreateIndex
CREATE INDEX "ExplainabilityPatternContribution_patternKey_idx" ON "ExplainabilityPatternContribution"("patternKey");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalExplainabilityPattern_patternKey_key" ON "GlobalExplainabilityPattern"("patternKey");

-- CreateIndex
CREATE INDEX "GlobalExplainabilityPattern_triggerId_idx" ON "GlobalExplainabilityPattern"("triggerId");

-- CreateIndex
CREATE INDEX "GlobalExplainabilityPattern_sourceType_idx" ON "GlobalExplainabilityPattern"("sourceType");
