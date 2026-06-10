-- AlterTable
ALTER TABLE "bikes" ADD COLUMN     "has_front_suspension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_rear_suspension" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "components_mounted" ALTER COLUMN "total_km" DROP DEFAULT;

-- AlterTable
ALTER TABLE "events_action" ADD COLUMN     "req_front_suspension" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "req_rear_suspension" BOOLEAN NOT NULL DEFAULT false;
