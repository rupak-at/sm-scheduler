-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN     "tokenCheckedAt" TIMESTAMPTZ(3),
ADD COLUMN     "tokenKeyVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tokenRefreshedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "externalContainerId" TEXT,
ADD COLUMN     "publishRequestedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "OAuthAttempt" (
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "userId" UUID,
    "sessionId" UUID,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OAuthAttempt_pkey" PRIMARY KEY ("stateHash")
);

-- CreateIndex
CREATE INDEX "OAuthAttempt_expiresAt_idx" ON "OAuthAttempt"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_provider_providerAccountId_key" ON "SocialAccount"("provider", "providerAccountId");
