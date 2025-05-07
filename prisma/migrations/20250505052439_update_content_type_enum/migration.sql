/*
  Warnings:

  - The values [TRACK,SAMPLE_PACK,SOUND_KIT] on the enum `ContentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContentType_new" AS ENUM ('BEATS', 'LOOPS', 'SOUNDKITS', 'PRESETS');
ALTER TYPE "ContentType" RENAME TO "ContentType_old";
ALTER TYPE "ContentType_new" RENAME TO "ContentType";
DROP TYPE "ContentType_old";
COMMIT;
