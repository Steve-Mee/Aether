-- Phase 9: Kafka outbox relay tracking
ALTER TABLE "DomainEvent" ADD COLUMN "relayedAt" TIMESTAMP(3);
CREATE INDEX "DomainEvent_relayedAt_processedAt_idx" ON "DomainEvent"("relayedAt", "processedAt");
