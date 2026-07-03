-- Remove implicit tenant_default defaults; tenantId must be set explicitly by application layer.
-- Only tables that exist with a tenantId DEFAULT at this migration point are included.

ALTER TABLE "Customer" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "EmailMessage" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Supplier" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "SupplierChange" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Decision" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Approval" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "DomainEvent" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "OutcomeRecord" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Plugin" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Insight" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "PhysicalLocation" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Negotiation" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "BillingRecord" ALTER COLUMN "tenantId" DROP DEFAULT;
