-- AlterTable
ALTER TABLE "bike_types" ADD COLUMN     "i18n_key" VARCHAR;

-- AlterTable
ALTER TABLE "component_groups" ADD COLUMN     "i18n_key" VARCHAR;

-- AlterTable
ALTER TABLE "component_types" ADD COLUMN     "i18n_key" VARCHAR;

-- AlterTable
ALTER TABLE "event_action_tags" ADD COLUMN     "i18n_key" VARCHAR;

-- AlterTable
ALTER TABLE "events_action" ADD COLUMN     "i18n_key" VARCHAR;
