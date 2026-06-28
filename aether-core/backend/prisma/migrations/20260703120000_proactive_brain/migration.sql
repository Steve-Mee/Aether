-- Proactive AETHER Brain v1: suggestion persistence + merchant prefs
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "proactivePrefs" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "ProactiveSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triggerId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "agentKey" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "command" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "executionMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "snoozedUntil" TIMESTAMP(3),
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProactiveSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProactiveSuggestion_tenantId_dedupeKey_key" ON "ProactiveSuggestion"("tenantId", "dedupeKey");
CREATE INDEX IF NOT EXISTS "ProactiveSuggestion_tenantId_status_priority_idx" ON "ProactiveSuggestion"("tenantId", "status", "priority");
