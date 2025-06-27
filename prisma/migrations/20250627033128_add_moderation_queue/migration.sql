-- CreateTable
CREATE TABLE "ModerationQueue" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationQueue_trackId_idx" ON "ModerationQueue"("trackId");

-- CreateIndex
CREATE INDEX "ModerationQueue_reporterId_idx" ON "ModerationQueue"("reporterId");

-- CreateIndex
CREATE INDEX "ModerationQueue_isResolved_idx" ON "ModerationQueue"("isResolved");

-- AddForeignKey
ALTER TABLE "ModerationQueue" ADD CONSTRAINT "ModerationQueue_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationQueue" ADD CONSTRAINT "ModerationQueue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
