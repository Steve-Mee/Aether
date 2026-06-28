-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "brainCrossTenantAgentPatternsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GlobalAgentPattern" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "tenantCount" INTEGER NOT NULL DEFAULT 0,
    "kAnonymityMet" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalAgentPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalAgentPattern_category_agentKey_patternType_key" ON "GlobalAgentPattern"("category", "agentKey", "patternType");

-- CreateIndex
CREATE INDEX "GlobalAgentPattern_category_idx" ON "GlobalAgentPattern"("category");

-- CreateIndex
CREATE INDEX "GlobalAgentPattern_agentKey_idx" ON "GlobalAgentPattern"("agentKey");
