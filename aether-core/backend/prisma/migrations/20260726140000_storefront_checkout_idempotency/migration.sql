-- Storefront checkout idempotency (P13): replay-safe orderId + clientSecret/redirectUrl.
CREATE TABLE IF NOT EXISTS "StorefrontCheckoutIdempotency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "redirectUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorefrontCheckoutIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontCheckoutIdempotency_tenantId_key_key"
  ON "StorefrontCheckoutIdempotency"("tenantId", "key");

CREATE INDEX IF NOT EXISTS "StorefrontCheckoutIdempotency_tenantId_idx"
  ON "StorefrontCheckoutIdempotency"("tenantId");
