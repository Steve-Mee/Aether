-- AlterTable BillingRecord
ALTER TABLE "BillingRecord" ADD COLUMN IF NOT EXISTS "stripeInvoiceId" TEXT;
ALTER TABLE "BillingRecord" ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3);

-- AlterTable Mailbox
ALTER TABLE "Mailbox" ADD COLUMN IF NOT EXISTS "pollingPolicy" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Mailbox" ADD COLUMN IF NOT EXISTS "lastPolledAt" TIMESTAMP(3);
