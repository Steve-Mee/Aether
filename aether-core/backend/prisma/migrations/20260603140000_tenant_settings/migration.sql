-- CreateTable
CREATE TABLE "TenantSettings" (
    "tenantId" TEXT NOT NULL,
    "autonomyLevel" TEXT NOT NULL DEFAULT 'medium',
    "autoApproveLowRisk" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveMediumRiskMail" BOOLEAN NOT NULL DEFAULT false,
    "maxAutoPriceChangePct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "maxMarginImpactEuro" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "policyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoRunWindow" TEXT NOT NULL DEFAULT 'always',
    "autoRunWindowStart" TEXT DEFAULT '18:00',
    "autoRunWindowEnd" TEXT DEFAULT '08:00',
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "locale" TEXT NOT NULL DEFAULT 'nl',
    "dataExportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
