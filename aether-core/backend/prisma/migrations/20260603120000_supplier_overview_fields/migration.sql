-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Supplier" ADD COLUMN "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Supplier" ADD COLUMN "supplierType" TEXT;
