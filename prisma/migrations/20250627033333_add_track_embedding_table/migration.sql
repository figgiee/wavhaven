-- CreateTable
CREATE TABLE "TrackEmbedding" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackEmbedding_trackId_key" ON "TrackEmbedding"("trackId");

-- AddForeignKey
ALTER TABLE "TrackEmbedding" ADD CONSTRAINT "TrackEmbedding_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
