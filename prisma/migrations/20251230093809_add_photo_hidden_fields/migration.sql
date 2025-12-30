-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "hidden_at" TIMESTAMP(3),
ADD COLUMN     "hidden_by" TEXT,
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "photos_is_hidden_idx" ON "photos"("is_hidden");
