/*
  Warnings:

  - A unique constraint covering the columns `[activity_strava_id]` on the table `rides` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "activity_strava_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "rides_activity_strava_id_key" ON "rides"("activity_strava_id");
