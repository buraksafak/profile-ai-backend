-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "user_prompt" TEXT NOT NULL,
    "ai_response" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "response_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);
