/*
  Warnings:

  - You are about to drop the column `stravaGearId` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the column `stravaName` on the `bikes` table. All the data in the column will be lost.
  - You are about to drop the column `stravaAthleteId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[strava_athlete_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_stravaAthleteId_key";

-- AlterTable
ALTER TABLE "bikes" DROP COLUMN "stravaGearId",
DROP COLUMN "stravaName",
ADD COLUMN     "strava_gear_id" VARCHAR,
ADD COLUMN     "strava_name" VARCHAR;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stravaAthleteId",
ADD COLUMN     "strava_athlete_id" VARCHAR;

-- CreateIndex
CREATE UNIQUE INDEX "users_strava_athlete_id_key" ON "users"("strava_athlete_id");
