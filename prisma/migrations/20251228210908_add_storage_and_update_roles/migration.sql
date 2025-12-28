/*
  Warnings:

  - The values [OWNER,USER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - The `visibility` column on the `collections` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `grid_spacing` column on the `collections` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `is_password_protected` on the `enhanced_share_links` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `enhanced_share_links` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DownloadFormat" AS ENUM ('web', 'original');

-- CreateEnum
CREATE TYPE "DownloadJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'PHOTOGRAPHER', 'CLIENT');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PHOTOGRAPHER';
COMMIT;

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "cover_layout" TEXT NOT NULL DEFAULT 'center',
ADD COLUMN     "custom_accent_color" TEXT,
ADD COLUMN     "custom_background_color" TEXT,
ADD COLUMN     "grid_columns" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "last_modified" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "title_color" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "title_size" INTEGER NOT NULL DEFAULT 48,
DROP COLUMN "visibility",
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'public',
DROP COLUMN "grid_spacing",
ADD COLUMN     "grid_spacing" INTEGER NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE "enhanced_share_links" DROP COLUMN "is_password_protected",
DROP COLUMN "password",
ADD COLUMN     "access_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "password_hash" TEXT;

-- AlterTable
ALTER TABLE "photos" ALTER COLUMN "mime_type" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "max_collections" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "max_photos_per_collection" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "max_storage_gb" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
ALTER COLUMN "role" SET DEFAULT 'PHOTOGRAPHER';

-- CreateTable
CREATE TABLE "download_jobs" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "user_id" TEXT,
    "format" "DownloadFormat" NOT NULL DEFAULT 'original',
    "photo_ids" TEXT[],
    "status" "DownloadJobStatus" NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total_photos" INTEGER NOT NULL DEFAULT 0,
    "total_size" BIGINT,
    "zip_path" TEXT,
    "zip_url" TEXT,
    "error" TEXT,
    "expires_at" TIMESTAMP(3),
    "notification_email" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "download_jobs_collection_id_idx" ON "download_jobs"("collection_id");

-- CreateIndex
CREATE INDEX "download_jobs_status_idx" ON "download_jobs"("status");

-- CreateIndex
CREATE INDEX "download_jobs_created_at_idx" ON "download_jobs"("created_at");

-- CreateIndex
CREATE INDEX "collections_owner_id_idx" ON "collections"("owner_id");

-- CreateIndex
CREATE INDEX "collections_visibility_idx" ON "collections"("visibility");

-- CreateIndex
CREATE INDEX "collections_slug_idx" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "enhanced_share_links_token_idx" ON "enhanced_share_links"("token");

-- CreateIndex
CREATE INDEX "enhanced_share_links_collection_id_idx" ON "enhanced_share_links"("collection_id");

-- CreateIndex
CREATE INDEX "photos_collection_id_idx" ON "photos"("collection_id");

-- CreateIndex
CREATE INDEX "photos_processing_status_idx" ON "photos"("processing_status");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
