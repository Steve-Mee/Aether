-- CreateTable
CREATE TABLE "SecAggRound" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "minTenants" INTEGER NOT NULL DEFAULT 5,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "noiseEpsilon" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "aggregateValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecAggRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecAggParticipant" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "secretSeed" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecAggParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecAggMaskedUpdate" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maskedValue" DOUBLE PRECISION NOT NULL,
    "personalMask" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecAggMaskedUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecAggRound_category_metric_status_idx" ON "SecAggRound"("category", "metric", "status");
CREATE UNIQUE INDEX "SecAggParticipant_roundId_tenantId_key" ON "SecAggParticipant"("roundId", "tenantId");
CREATE INDEX "SecAggParticipant_roundId_idx" ON "SecAggParticipant"("roundId");
CREATE UNIQUE INDEX "SecAggMaskedUpdate_roundId_tenantId_key" ON "SecAggMaskedUpdate"("roundId", "tenantId");
CREATE INDEX "SecAggMaskedUpdate_roundId_idx" ON "SecAggMaskedUpdate"("roundId");

ALTER TABLE "SecAggParticipant" ADD CONSTRAINT "SecAggParticipant_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SecAggRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecAggMaskedUpdate" ADD CONSTRAINT "SecAggMaskedUpdate_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SecAggRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
