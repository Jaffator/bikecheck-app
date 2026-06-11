/*
  Warnings:

  - You are about to drop the column `duration_sec` on the `rides` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `rides` table. All the data in the column will be lost.
  - You are about to drop the column `speed_down` on the `rides` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "rides" DROP COLUMN "duration_sec",
DROP COLUMN "note",
DROP COLUMN "speed_down",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "drivetrain_meters" INTEGER,
ADD COLUMN     "duration_min" INTEGER,
ADD COLUMN     "json_data" JSONB,
ADD COLUMN     "summary" VARCHAR,
ADD COLUMN     "suspension_min" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6);
