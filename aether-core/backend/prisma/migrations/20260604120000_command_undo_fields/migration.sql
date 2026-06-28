-- AlterTable
ALTER TABLE "Command" ADD COLUMN "undoable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Command" ADD COLUMN "revertedAt" TIMESTAMP(3);
ALTER TABLE "Command" ADD COLUMN "undoExpiresAt" TIMESTAMP(3);
