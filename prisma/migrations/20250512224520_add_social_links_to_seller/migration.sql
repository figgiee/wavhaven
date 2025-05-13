/*
  Warnings:

  - You are about to alter the column `websiteUrl` on the `SellerProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2500)`.
  - You are about to alter the column `soundCloudUrl` on the `SellerProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2500)`.
  - You are about to alter the column `bannerImageUrl` on the `SellerProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.

*/
-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "instagramUrl" VARCHAR(2500),
ADD COLUMN     "tiktokUrl" VARCHAR(2500),
ADD COLUMN     "twitterUrl" VARCHAR(2500),
ADD COLUMN     "youtubeUrl" VARCHAR(2500),
ALTER COLUMN "websiteUrl" SET DATA TYPE VARCHAR(2500),
ALTER COLUMN "soundCloudUrl" SET DATA TYPE VARCHAR(2500),
ALTER COLUMN "bannerImageUrl" SET DATA TYPE VARCHAR(2048);
