-- CreateTable
CREATE TABLE "BrainKnowledgeContributionLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 1,
    "submitted" BOOLEAN NOT NULL,
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainKnowledgeContributionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainKnowledgeContributionLog_tenantId_createdAt_idx" ON "BrainKnowledgeContributionLog"("tenantId", "createdAt");
