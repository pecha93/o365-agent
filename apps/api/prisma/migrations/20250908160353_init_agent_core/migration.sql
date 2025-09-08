-- CreateEnum
CREATE TYPE "Source" AS ENUM ('TEAMS', 'OUTLOOK', 'CALENDAR');

-- CreateEnum
CREATE TYPE "OutboxType" AS ENUM ('TELEGRAM_NOTIFY', 'NOTION_TASK', 'EMAIL_DRAFT', 'CALENDAR_PROPOSAL');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SENT', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT,
    "participants" JSONB,
    "lastSummaryMd" TEXT,
    "lastSummaryUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "externalId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "text" TEXT,
    "mentions" TEXT[],
    "isDM" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "analysis" JSONB,
    "salesSignal" BOOLEAN NOT NULL DEFAULT false,
    "isFromTop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyDigest" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "contentMd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "type" "OutboxType" NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "relatedEventId" TEXT,
    "threadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigTop" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "identity" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigTop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LastSeen" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "lastExternalId" TEXT,
    "lastTs" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Thread_source_externalId_key" ON "Thread"("source", "externalId");

-- CreateIndex
CREATE INDEX "Event_threadId_ts_idx" ON "Event"("threadId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "Event_source_externalId_key" ON "Event"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyDigest_threadId_date_key" ON "DailyDigest"("threadId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigTop_source_identity_key" ON "ConfigTop"("source", "identity");

-- CreateIndex
CREATE UNIQUE INDEX "LastSeen_threadId_key" ON "LastSeen"("threadId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDigest" ADD CONSTRAINT "DailyDigest_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outbox" ADD CONSTRAINT "Outbox_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outbox" ADD CONSTRAINT "Outbox_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LastSeen" ADD CONSTRAINT "LastSeen_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
