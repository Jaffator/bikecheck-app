-- The service detail names an attachment by its weight as well as its type, so a receipt
-- reads as a receipt before it is opened. Nullable because attachments stored before this
-- column existed have no size on record and none can be recovered - those rows are read
-- back as a type alone.

ALTER TABLE "public"."bike_event_attachments" ADD COLUMN "size_bytes" INTEGER;
