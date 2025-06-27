/*
  Warnings:

  - The values [UNLIMITED] on the enum `LicenseType` will be removed. If these variants are still used in the database, this will fail.
  - The values [STEMS_ZIP] on the enum `TrackFileType` will be removed. If these variants are still used in the database, this will fail.
  - The values [GUEST] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `text` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `instagramHandle` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `stripeAccountVerified` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `tier` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `tiktokUrl` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `twitterHandle` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageFileId` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `isApproved` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `previewAudioFileId` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `salesCount` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `stemsFileId` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the `CommentLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TrackLike` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `content` to the `Comment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LicenseType_new" AS ENUM ('BASIC', 'PREMIUM', 'EXCLUSIVE');
ALTER TABLE "License" ALTER COLUMN "type" TYPE "LicenseType_new" USING ("type"::text::"LicenseType_new");
ALTER TYPE "LicenseType" RENAME TO "LicenseType_old";
ALTER TYPE "LicenseType_new" RENAME TO "LicenseType";
DROP TYPE "LicenseType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TrackFileType_new" AS ENUM ('IMAGE_PNG', 'IMAGE_JPEG', 'IMAGE_WEBP', 'PREVIEW_MP3', 'MAIN_MP3', 'MAIN_WAV', 'STEMS');
ALTER TABLE "License" ALTER COLUMN "filesIncluded" DROP DEFAULT;
ALTER TABLE "TrackFile" ALTER COLUMN "fileType" TYPE "TrackFileType_new" USING ("fileType"::text::"TrackFileType_new");
ALTER TABLE "License" ALTER COLUMN "filesIncluded" TYPE "TrackFileType_new"[] USING ("filesIncluded"::text::"TrackFileType_new"[]);
ALTER TYPE "TrackFileType" RENAME TO "TrackFileType_old";
ALTER TYPE "TrackFileType_new" RENAME TO "TrackFileType";
DROP TYPE "TrackFileType_old";
ALTER TABLE "License" ALTER COLUMN "filesIncluded" SET DEFAULT ARRAY[]::"TrackFileType"[];
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('CUSTOMER', 'PRODUCER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "CommentLike" DROP CONSTRAINT "CommentLike_commentId_fkey";

-- DropForeignKey
ALTER TABLE "CommentLike" DROP CONSTRAINT "CommentLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_coverImageFileId_fkey";

-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_previewAudioFileId_fkey";

-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_producerId_fkey";

-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_stemsFileId_fkey";

-- DropForeignKey
ALTER TABLE "TrackLike" DROP CONSTRAINT "TrackLike_trackId_fkey";

-- DropForeignKey
ALTER TABLE "TrackLike" DROP CONSTRAINT "TrackLike_userId_fkey";

-- DropIndex
DROP INDEX "Comment_parentId_idx";

-- DropIndex
DROP INDEX "Comment_userId_idx";

-- DropIndex
DROP INDEX "License_type_idx";

-- DropIndex
DROP INDEX "Order_stripeCheckoutSessionId_idx";

-- DropIndex
DROP INDEX "Order_stripePaymentIntentId_idx";

-- DropIndex
DROP INDEX "OrderItem_licenseId_idx";

-- DropIndex
DROP INDEX "OrderItem_orderId_idx";

-- DropIndex
DROP INDEX "OrderItem_trackId_idx";

-- DropIndex
DROP INDEX "SellerProfile_stripeAccountId_idx";

-- DropIndex
DROP INDEX "SellerProfile_userId_idx";

-- DropIndex
DROP INDEX "Tag_name_idx";

-- DropIndex
DROP INDEX "Track_coverImageFileId_key";

-- DropIndex
DROP INDEX "Track_createdAt_idx";

-- DropIndex
DROP INDEX "Track_previewAudioFileId_key";

-- DropIndex
DROP INDEX "Track_slug_idx";

-- DropIndex
DROP INDEX "Track_stemsFileId_key";

-- DropIndex
DROP INDEX "UserDownloadPermission_orderItemId_idx";

-- DropIndex
DROP INDEX "UserDownloadPermission_trackId_idx";

-- DropIndex
DROP INDEX "UserDownloadPermission_userId_idx";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "content" TEXT;

-- UpdateTable
UPDATE "Comment" SET "content" = "text" WHERE "text" IS NOT NULL;

-- AlterColumn
ALTER TABLE "Comment" ALTER COLUMN "content" SET NOT NULL;

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "text";

-- AlterTable
ALTER TABLE "SellerProfile" DROP COLUMN "instagramHandle",
DROP COLUMN "stripeAccountVerified",
DROP COLUMN "tier",
DROP COLUMN "tiktokUrl",
DROP COLUMN "twitterHandle",
ADD COLUMN     "stripeAccountReady" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "websiteUrl" SET DATA TYPE TEXT,
ALTER COLUMN "soundCloudUrl" SET DATA TYPE TEXT,
ALTER COLUMN "bannerImageUrl" SET DATA TYPE TEXT,
ALTER COLUMN "instagramUrl" SET DATA TYPE TEXT,
ALTER COLUMN "twitterUrl" SET DATA TYPE TEXT,
ALTER COLUMN "youtubeUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Track" DROP COLUMN "coverImageFileId",
DROP COLUMN "isApproved",
DROP COLUMN "previewAudioFileId",
DROP COLUMN "publishedAt",
DROP COLUMN "salesCount",
DROP COLUMN "stemsFileId",
ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contentType" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- DropTable
DROP TABLE "CommentLike";

-- DropTable
DROP TABLE "TrackLike";

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follows" (
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follows_pkey" PRIMARY KEY ("followerId","followingId")
);

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistTrack" (
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("playlistId","trackId")
);

-- CreateIndex
CREATE INDEX "Like_trackId_idx" ON "Like"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_trackId_key" ON "Like"("userId", "trackId");

-- CreateIndex
CREATE INDEX "Playlist_userId_idx" ON "Playlist"("userId");

-- CreateIndex
CREATE INDEX "Track_title_idx" ON "Track"("title");

-- CreateIndex
CREATE INDEX "Track_minPrice_idx" ON "Track"("minPrice");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follows" ADD CONSTRAINT "Follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follows" ADD CONSTRAINT "Follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
