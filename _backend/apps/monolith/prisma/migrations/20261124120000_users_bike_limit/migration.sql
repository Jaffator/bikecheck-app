-- How many Bikes the account may hold, archived ones included; raised by hand per account.
ALTER TABLE "users" ADD COLUMN "bike_limit" INTEGER NOT NULL DEFAULT 1;
