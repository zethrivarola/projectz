/*
  Warnings:

  - You are about to drop the column `is_starred` on the `collections` table. All the data in the column will be lost.
  - You are about to drop the column `is_starred` on the `photos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "collections" DROP COLUMN "is_starred";

-- AlterTable
ALTER TABLE "photos" DROP COLUMN "is_starred";
