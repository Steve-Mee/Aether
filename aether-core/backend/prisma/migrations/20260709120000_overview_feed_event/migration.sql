-- CreateTable
CREATE TABLE "OverviewFeedEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "payload" JSONB NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "module" TEXT,
    "riskLevel" TEXT,
    "executionMode" TEXT,
    "agentKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchText" TEXT,
    "emailDispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverviewFeedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OverviewFeedEvent_idempotencyKey_key" ON "OverviewFeedEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OverviewFeedEvent_tenantId_visible_at_kind_itemId_idx" ON "OverviewFeedEvent"("tenantId", "visible", "at" DESC, "kind", "itemId");

-- CreateIndex
CREATE INDEX "OverviewFeedEvent_tenantId_emailDispatchedAt_createdAt_idx" ON "OverviewFeedEvent"("tenantId", "emailDispatchedAt", "createdAt");
