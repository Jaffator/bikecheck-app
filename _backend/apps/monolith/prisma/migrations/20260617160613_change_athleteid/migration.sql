/*
  Warnings:

  - You are about to drop the column `athlete_id` on the `strava_pending_activities` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `strava_pending_activities` table without a default value. This is not possible if the table is not empty.
  - Made the column `gear_id` on table `strava_pending_activities` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "strava_pending_gear_athlete";

-- AlterTable
ALTER TABLE "strava_pending_activities" DROP COLUMN "athlete_id",
ADD COLUMN     "user_id" INTEGER NOT NULL,
ALTER COLUMN "gear_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "strava_pending_gear_athlete" ON "strava_pending_activities"("gear_id", "user_id");
