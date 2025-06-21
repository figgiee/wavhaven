-- CreateIndex
CREATE INDEX "SellerProfile_storeName_idx" ON "SellerProfile"("storeName");

-- CreateIndex
CREATE INDEX "Track_title_idx" ON "Track"("title");

-- CreateIndex
CREATE INDEX "Track_tags_idx" ON "Track"("tags");

-- CreateIndex
CREATE INDEX "Track_description_idx" ON "Track"("description");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");
