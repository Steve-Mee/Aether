-- Hybrid Redis failsafe: durable spill when Redis RAM approaches capacity.
CREATE TABLE "RedisSpill" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'spillable',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedisSpill_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RedisSpill_expiresAt_idx" ON "RedisSpill"("expiresAt");
CREATE INDEX "RedisSpill_priority_idx" ON "RedisSpill"("priority");
