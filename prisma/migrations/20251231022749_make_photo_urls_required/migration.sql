/*
  Warnings:

  - Made the column `thumbnail_url` on table `photos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `web_url` on table `photos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "photos" ALTER COLUMN "thumbnail_url" SET NOT NULL,
ALTER COLUMN "web_url" SET NOT NULL;
