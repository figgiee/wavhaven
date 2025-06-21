/*
  Warnings:

  - The values [PRODUCER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('FREE', 'PRO');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('GUEST', 'CUSTOMER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER',
ALTER COLUMN "isGuest" SET DEFAULT false;

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeName" TEXT,
    "tier" "SellerTier" NOT NULL DEFAULT 'FREE',
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "SellerProfile_userId_idx" ON "SellerProfile"("userId");

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
