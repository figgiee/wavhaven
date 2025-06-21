-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BEATS', 'LOOPS', 'SOUNDKITS', 'PRESETS');

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "contentType" "ContentType" NOT NULL DEFAULT 'BEATS';

-- CreateIndex
CREATE INDEX "Track_contentType_idx" ON "Track"("contentType");
