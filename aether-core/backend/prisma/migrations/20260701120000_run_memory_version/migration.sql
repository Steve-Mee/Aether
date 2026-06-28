-- Shared memory v1: optimistic versioning for concurrent agent writes
ALTER TABLE "RunWorkingMemory" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
