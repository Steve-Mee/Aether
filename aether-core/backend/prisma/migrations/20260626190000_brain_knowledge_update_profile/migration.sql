-- Tenant brain knowledge update profile (conservative / balanced / aggressive)
ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "brainKnowledgeUpdateProfile" TEXT NOT NULL DEFAULT 'balanced';
