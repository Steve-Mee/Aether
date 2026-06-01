-- Event outbox idempotency + processing timestamp
ALTER TABLE "DomainEvent" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "DomainEvent" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "DomainEvent_idempotencyKey_key" ON "DomainEvent"("idempotencyKey");
