-- AlterTable EmailMessage
ALTER TABLE "EmailMessage" ADD COLUMN IF NOT EXISTS "messageId" TEXT;
ALTER TABLE "EmailMessage" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailMessage_tenantId_messageId_key" ON "EmailMessage"("tenantId", "messageId");

-- CreateTable Mailbox
CREATE TABLE IF NOT EXISTS "Mailbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_default',
    "email" TEXT NOT NULL,
    "imapHost" TEXT,
    "smtpHost" TEXT,
    "credentialsEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Mailbox_tenantId_email_key" ON "Mailbox"("tenantId", "email");

-- AlterTable OutcomeRecord
ALTER TABLE "OutcomeRecord" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'proposed';

-- CreateTable WorkflowRun
CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_default',
    "workflow" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkflowStep
CREATE TABLE IF NOT EXISTS "WorkflowStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "WorkflowStep" DROP CONSTRAINT IF EXISTS "WorkflowStep_runId_fkey";
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable PrivacyBudget
CREATE TABLE IF NOT EXISTS "PrivacyBudget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetLimit" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrivacyBudget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PrivacyBudget_tenantId_key" ON "PrivacyBudget"("tenantId");

-- CreateTable TenantFeature
CREATE TABLE IF NOT EXISTS "TenantFeature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TenantFeature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantFeature_tenantId_feature_key" ON "TenantFeature"("tenantId", "feature");

-- CreateTable PaymentIdempotency
CREATE TABLE IF NOT EXISTS "PaymentIdempotency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_default',
    "key" TEXT NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentIdempotency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentIdempotency_tenantId_key_key" ON "PaymentIdempotency"("tenantId", "key");

-- CreateTable RevenueDistribution
CREATE TABLE IF NOT EXISTS "RevenueDistribution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_default',
    "merchantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevenueDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable InventoryItem
CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_default',
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL DEFAULT 'default',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_tenantId_productId_warehouseId_key" ON "InventoryItem"("tenantId", "productId", "warehouseId");

-- CreateTable SupplierWebhookEvent
CREATE TABLE IF NOT EXISTS "SupplierWebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'tenant_default',
    "supplierId" TEXT,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierWebhookEvent_pkey" PRIMARY KEY ("id")
);
