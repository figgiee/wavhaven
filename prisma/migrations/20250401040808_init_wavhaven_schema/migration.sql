-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'CUSTOMER', 'PRODUCER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TrackFileType" AS ENUM ('PREVIEW_MP3', 'MAIN_MP3', 'MAIN_WAV', 'STEMS_ZIP');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('BASIC', 'PREMIUM', 'UNLIMITED', 'EXCLUSIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'GUEST',
    "isGuest" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "producerId" TEXT NOT NULL,
    "previewAudioUrl" TEXT,
    "coverImageUrl" TEXT,
    "bpm" INTEGER,
    "key" TEXT,
    "tags" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackFile" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "fileType" "TrackFileType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "type" "LicenseType" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "api_version" TEXT,
    "data" JSONB NOT NULL,
    "request" JSONB,
    "type" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "account" TEXT,
    "created" TIMESTAMP(3) NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "pending_webhooks" INTEGER NOT NULL,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mood" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Mood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToTrack" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GenreToTrack_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MoodToTrack" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MoodToTrack_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Track_producerId_idx" ON "Track"("producerId");

-- CreateIndex
CREATE INDEX "Track_isPublished_idx" ON "Track"("isPublished");

-- CreateIndex
CREATE INDEX "TrackFile_trackId_idx" ON "TrackFile"("trackId");

-- CreateIndex
CREATE INDEX "License_trackId_idx" ON "License"("trackId");

-- CreateIndex
CREATE INDEX "License_type_idx" ON "License"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_trackId_idx" ON "OrderItem"("trackId");

-- CreateIndex
CREATE INDEX "OrderItem_licenseId_idx" ON "OrderItem"("licenseId");

-- CreateIndex
CREATE INDEX "StripeEvent_type_idx" ON "StripeEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Mood_name_key" ON "Mood"("name");

-- CreateIndex
CREATE INDEX "_GenreToTrack_B_index" ON "_GenreToTrack"("B");

-- CreateIndex
CREATE INDEX "_MoodToTrack_B_index" ON "_MoodToTrack"("B");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackFile" ADD CONSTRAINT "TrackFile_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToTrack" ADD CONSTRAINT "_GenreToTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToTrack" ADD CONSTRAINT "_GenreToTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MoodToTrack" ADD CONSTRAINT "_MoodToTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "Mood"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MoodToTrack" ADD CONSTRAINT "_MoodToTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
