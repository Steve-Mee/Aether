-- CreateTable
CREATE TABLE "NotificationInboxState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationInboxState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationInboxState_tenantId_actorId_notificationId_key" ON "NotificationInboxState"("tenantId", "actorId", "notificationId");

-- CreateIndex
CREATE INDEX "NotificationInboxState_tenantId_actorId_idx" ON "NotificationInboxState"("tenantId", "actorId");
