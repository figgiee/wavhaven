/*
  Warnings:

  - You are about to drop the column `viewCount` on the `Track` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Track" DROP COLUMN "viewCount",
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;
