-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "autonomyPrefs" JSONB NOT NULL DEFAULT '{}';
