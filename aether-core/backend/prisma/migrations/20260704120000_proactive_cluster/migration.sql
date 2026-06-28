-- Proactive Brain v2: cluster dedupe + enrichment metadata
ALTER TABLE "ProactiveSuggestion" ADD COLUMN IF NOT EXISTS "clusterKey" TEXT;
ALTER TABLE "ProactiveSuggestion" ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP(3);
ALTER TABLE "ProactiveSuggestion" ADD COLUMN IF NOT EXISTS "enrichmentSource" TEXT;

CREATE INDEX IF NOT EXISTS "ProactiveSuggestion_tenantId_clusterKey_status_idx"
  ON "ProactiveSuggestion"("tenantId", "clusterKey", "status");
