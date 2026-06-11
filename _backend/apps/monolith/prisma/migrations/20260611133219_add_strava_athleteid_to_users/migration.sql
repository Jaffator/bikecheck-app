/*
  Warnings:

  - A unique constraint covering the columns `[stravaAthleteId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stravaAthleteId" VARCHAR;

-- CreateIndex
CREATE UNIQUE INDEX "users_stravaAthleteId_key" ON "users"("stravaAthleteId");
