-- AlterTable
ALTER TABLE "action_service_intervals" ADD COLUMN     "category" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
