CREATE TABLE "FederatedExecutionAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sourceAgentKey" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "summaryHash" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FederatedExecutionAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FederatedExecutionAudit_requestId_key" ON "FederatedExecutionAudit"("requestId");
CREATE INDEX "FederatedExecutionAudit_tenantId_createdAt_idx" ON "FederatedExecutionAudit"("tenantId", "createdAt");
