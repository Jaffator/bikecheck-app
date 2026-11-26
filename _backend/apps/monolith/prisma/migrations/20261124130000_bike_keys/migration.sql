-- A shared code that raises an account's bike limit. No row is made here: no key value in git.
CREATE TABLE "bike_keys" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR NOT NULL,
    "bike_limit" INTEGER NOT NULL,
    "max_accounts" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bike_keys_pkey" PRIMARY KEY ("id")
);

-- Case and outer spaces do not matter when a key is entered, so they cannot tell two apart.
CREATE UNIQUE INDEX "bike_keys_code_lower_key" ON "bike_keys" (lower(btrim("code")));

-- Uses are counted from this; deleting the key clears it and leaves bike_limit alone.
ALTER TABLE "users" ADD COLUMN "bike_key_id" INTEGER;
CREATE INDEX "users_bike_key_id_idx" ON "users"("bike_key_id");
ALTER TABLE "users" ADD CONSTRAINT "users_bike_key_id_fkey" FOREIGN KEY ("bike_key_id") REFERENCES "bike_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
