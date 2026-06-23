-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "public_token" VARCHAR NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bike_id" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMPTZ(6),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_public_token_key" ON "reports"("public_token");

-- CreateIndex
CREATE INDEX "reports_user_id" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "reports_bike_id" ON "reports"("bike_id");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
