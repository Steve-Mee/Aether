ALTER TABLE "BrainKnowledgeContributionLog" ADD COLUMN IF NOT EXISTS "metricFingerprint" TEXT;

CREATE INDEX IF NOT EXISTS "BrainKnowledgeContributionLog_tenantId_metricFingerprint_idx"
  ON "BrainKnowledgeContributionLog"("tenantId", "metricFingerprint");
