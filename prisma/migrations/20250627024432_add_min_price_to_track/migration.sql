/*
  Warnings:

  - Made the column `isApproved` on table `Track` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "minPrice" DECIMAL(10,2);

-- Step 1: Update existing NULL values to a sensible default (e.g., true)
UPDATE "Track" SET "isApproved" = true WHERE "isApproved" IS NULL;

-- Step 2: Now alter the column
ALTER TABLE "Track" ALTER COLUMN "isApproved" SET NOT NULL,
                    ALTER COLUMN "isApproved" SET DEFAULT true;
