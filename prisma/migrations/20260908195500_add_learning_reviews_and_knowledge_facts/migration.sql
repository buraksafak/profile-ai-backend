-- CreateTable
CREATE TABLE "learning_reviews" (
    "id" TEXT NOT NULL,
    "message_id" TEXT,
    "user_prompt" TEXT NOT NULL,
    "normalized_prompt" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "fact_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_facts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_reviews_message_id_key" ON "learning_reviews"("message_id");

-- CreateIndex
CREATE INDEX "learning_reviews_status_created_at_idx" ON "learning_reviews"("status", "created_at");

-- CreateIndex
CREATE INDEX "learning_reviews_normalized_prompt_status_idx" ON "learning_reviews"("normalized_prompt", "status");

-- AddForeignKey
ALTER TABLE "learning_reviews" ADD CONSTRAINT "learning_reviews_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_reviews" ADD CONSTRAINT "learning_reviews_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "knowledge_facts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
