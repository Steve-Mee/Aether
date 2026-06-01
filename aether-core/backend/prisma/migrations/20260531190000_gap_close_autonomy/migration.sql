-- Gap-close: self-evolving rollout snapshots + persistent negotiation metrics
ALTER TABLE "ImprovementProposal" ADD COLUMN IF NOT EXISTS "appliedConfig" JSONB;

CREATE TABLE IF NOT EXISTS "NegotiationMetrics" (
  "tenantId" TEXT NOT NULL PRIMARY KEY,
  "accept" INTEGER NOT NULL DEFAULT 0,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "reject" INTEGER NOT NULL DEFAULT 0,
  "llmUsed" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
