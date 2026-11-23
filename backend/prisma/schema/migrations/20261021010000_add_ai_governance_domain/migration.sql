-- CreateTable
CREATE TABLE "ai_knowledge_articles" (
    "id" TEXT NOT NULL,
    "question" VARCHAR(255) NOT NULL,
    "answer" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_intents" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tool" VARCHAR(100) NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tool_permissions" (
    "id" TEXT NOT NULL,
    "toolKey" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "write" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tool_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_escalation_rules" (
    "id" TEXT NOT NULL,
    "condition" VARCHAR(255) NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_knowledge_articles_status_idx" ON "ai_knowledge_articles"("status");

-- CreateIndex
CREATE INDEX "ai_knowledge_articles_category_idx" ON "ai_knowledge_articles"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ai_intents_name_key" ON "ai_intents"("name");

-- CreateIndex
CREATE INDEX "ai_intents_tool_idx" ON "ai_intents"("tool");

-- CreateIndex
CREATE UNIQUE INDEX "ai_tool_permissions_toolKey_key" ON "ai_tool_permissions"("toolKey");

-- CreateIndex
CREATE INDEX "ai_escalation_rules_active_idx" ON "ai_escalation_rules"("active");
