-- CreateTable
CREATE TABLE "DistilledPatternOccurrence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patternHash" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistilledPatternOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DistilledPatternOccurrence_tenantId_patternHash_key" ON "DistilledPatternOccurrence"("tenantId", "patternHash");

-- CreateIndex
CREATE INDEX "DistilledPatternOccurrence_tenantId_idx" ON "DistilledPatternOccurrence"("tenantId");
