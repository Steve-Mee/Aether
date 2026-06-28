-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "overviewPrefs" JSONB NOT NULL DEFAULT '{}';
