-- CreateTable
CREATE TABLE "MsAccount" (
    "id" TEXT NOT NULL,
    "homeAccountId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MsAccount_homeAccountId_key" ON "MsAccount"("homeAccountId");
