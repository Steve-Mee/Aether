-- CreateTable
CREATE TABLE "BrainLoRAAdapter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adapterId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '0.0.0',
    "storagePath" TEXT NOT NULL,
    "traits" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainLoRAAdapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainLoRAAdapter_tenantId_adapterId_key" ON "BrainLoRAAdapter"("tenantId", "adapterId");

-- CreateIndex
CREATE INDEX "BrainLoRAAdapter_tenantId_idx" ON "BrainLoRAAdapter"("tenantId");
