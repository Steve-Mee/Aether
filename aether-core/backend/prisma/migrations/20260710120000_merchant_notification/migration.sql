-- CreateTable
CREATE TABLE "MerchantNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "href" TEXT,
    "actionLabel" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT '',
    "groupKey" TEXT,
    "groupCount" INTEGER NOT NULL DEFAULT 1,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "MerchantNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDigestState" (
    "tenantId" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "lastWindowStart" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDigestState_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantNotification_tenantId_createdAt_idx" ON "MerchantNotification"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantNotification_tenantId_groupKey_createdAt_idx" ON "MerchantNotification"("tenantId", "groupKey", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantNotification_tenantId_visible_createdAt_idx" ON "MerchantNotification"("tenantId", "visible", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantNotification_tenantId_sourceType_sourceId_kind_key" ON "MerchantNotification"("tenantId", "sourceType", "sourceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_tenantId_actorId_idx" ON "PushSubscription"("tenantId", "actorId");
