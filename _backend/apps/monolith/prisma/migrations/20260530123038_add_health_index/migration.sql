-- AlterTable
ALTER TABLE "action_service_intervals" ALTER COLUMN "service_interval_km" DROP NOT NULL,
ALTER COLUMN "service_interval_h" DROP NOT NULL,
ALTER COLUMN "health_index_interval" DROP NOT NULL;
