-- Enable pgvector for Intelligence Layer semantic memory
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "BrainMemory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainAgentState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL DEFAULT 'default',
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainAgentState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainMemory_tenantId_idx" ON "BrainMemory"("tenantId");

-- CreateIndex
CREATE INDEX "BrainMemory_embedding_idx" ON "BrainMemory" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "BrainAgentState_tenantId_sessionKey_key" ON "BrainAgentState"("tenantId", "sessionKey");
