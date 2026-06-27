-- Per-tenant intelligence layer overrides (hybrid / self-hosted prep)
ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "brainVectorBackend" TEXT,
  ADD COLUMN IF NOT EXISTS "brainKnowledgeTransferEnabled" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "brainLoRAPath" TEXT;
