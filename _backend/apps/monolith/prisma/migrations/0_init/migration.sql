-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" VARCHAR NOT NULL,
    "providerID" VARCHAR NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."action_done_component_map" (
    "event_action_done_id" INTEGER NOT NULL,
    "component_mounted_id" INTEGER NOT NULL,

    CONSTRAINT "action_done_component_map_pkey" PRIMARY KEY ("event_action_done_id","component_mounted_id")
);

-- CreateTable
CREATE TABLE "public"."action_service_intervals" (
    "id" SERIAL NOT NULL,
    "service_interval_km" INTEGER NOT NULL,
    "service_interval_h" INTEGER NOT NULL,
    "brake_load" INTEGER NOT NULL,
    "event_actions_id" INTEGER NOT NULL,

    CONSTRAINT "component_service_intervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bike_brands" (
    "id" SERIAL NOT NULL,
    "bike_brand" VARCHAR NOT NULL,

    CONSTRAINT "bike_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bike_event_attachments" (
    "id" SERIAL NOT NULL,
    "bike_event_id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "url" VARCHAR NOT NULL,
    "content_type" VARCHAR NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bike_event_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bike_models" (
    "id" SERIAL NOT NULL,
    "model_name" VARCHAR(255) NOT NULL,
    "brand_id" INTEGER NOT NULL,

    CONSTRAINT "bike_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bike_sizes" (
    "id" SERIAL NOT NULL,
    "size" VARCHAR,

    CONSTRAINT "bike_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bike_types" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR,

    CONSTRAINT "bike_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bikes" (
    "id" SERIAL NOT NULL,
    "bike_type_id" INTEGER,
    "year" INTEGER,
    "wheel_size_id" INTEGER,
    "bike_size_id" INTEGER,
    "mileage_km" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "frame_material" VARCHAR(50),
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "bikename" VARCHAR(50),
    "description" VARCHAR(255),
    "bike_brand" VARCHAR(255) NOT NULL,
    "bike_model" VARCHAR(255),
    "user_id" INTEGER NOT NULL,
    "organization_id" INTEGER,
    "image_url" VARCHAR,
    "ride_style_id" INTEGER,
    "ebike" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."component_groups" (
    "id" SERIAL NOT NULL,
    "group_name" VARCHAR NOT NULL,
    "side_choice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "component_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."component_types" (
    "id" SERIAL NOT NULL,
    "component_type" VARCHAR NOT NULL,
    "ebike" BOOLEAN NOT NULL DEFAULT false,
    "component_group_id" INTEGER NOT NULL,
    "has_position" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER,

    CONSTRAINT "component_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."components_mounted" (
    "id" SERIAL NOT NULL,
    "bike_id" INTEGER NOT NULL,
    "component_type_id" INTEGER NOT NULL,
    "mounted_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "component_desc" VARCHAR,
    "position" VARCHAR,
    "total_km" INTEGER DEFAULT 0,
    "total_minutes" INTEGER DEFAULT 0,
    "brake_load" INTEGER DEFAULT 0,

    CONSTRAINT "bike_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_action_tags" (
    "id" SERIAL NOT NULL,
    "event_action_id" INTEGER NOT NULL,
    "event_action_tag" VARCHAR NOT NULL,

    CONSTRAINT "event_action_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_action_targets" (
    "id" SERIAL NOT NULL,
    "event_action_id" INTEGER NOT NULL,
    "component_type_id" INTEGER NOT NULL,

    CONSTRAINT "event_action_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_actions_done" (
    "id" SERIAL NOT NULL,
    "bike_event_id" INTEGER NOT NULL,
    "event_action_id" INTEGER NOT NULL,
    "note" TEXT,
    "partial_cost" DECIMAL(10,2),
    "part_replaced" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "bike_mileage_at_time" INTEGER,

    CONSTRAINT "event_actions_done_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events_action" (
    "id" SERIAL NOT NULL,
    "action_name" VARCHAR NOT NULL,
    "replace_action" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER,

    CONSTRAINT "action_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events_bikes" (
    "id" SERIAL NOT NULL,
    "bike_id" INTEGER,
    "note" TEXT,
    "total_cost" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bike_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_members" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "organization_id" INTEGER NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organization_roles" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER,
    "description" TEXT,

    CONSTRAINT "organization_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMPTZ(6),
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(100),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ride_styles" (
    "id" SERIAL NOT NULL,
    "ride_style" VARCHAR,

    CONSTRAINT "ride_styles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rides" (
    "id" SERIAL NOT NULL,
    "bike_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "duration_sec" INTEGER,
    "distance_m" INTEGER,
    "elevation_down_m" INTEGER,
    "elevation_up_m" INTEGER,
    "speed_down" INTEGER,
    "speed_avg" INTEGER,
    "braking_load_score" INTEGER,
    "max_speed_kmh" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suspension_setup" (
    "id" SERIAL NOT NULL,
    "mounted_component_id" INTEGER NOT NULL,
    "setup_date" TIMETZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pressure_psi" INTEGER,
    "pressure_bar" INTEGER,
    "sag_percentage" INTEGER,
    "amount_tokens_spacers" INTEGER,
    "rebound_ls" INTEGER,
    "rebound_hs" INTEGER,
    "compression_ls" INTEGER,
    "compression_hs" INTEGER,
    "notes" VARCHAR,

    CONSTRAINT "suspension_setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tire_setup" (
    "id" SERIAL NOT NULL,
    "component_mounted_id" INTEGER NOT NULL,
    "tire_pressure_bar" INTEGER,
    "tire_pressure_psi" INTEGER,

    CONSTRAINT "tire_setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR,
    "email" VARCHAR NOT NULL,
    "password_hash" VARCHAR,
    "avatar_url" VARCHAR,
    "language" VARCHAR,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),
    "currency" VARCHAR,
    "weight_kg" INTEGER,
    "is_deleted" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "googleId" VARCHAR,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wheel_sizes" (
    "id" SERIAL NOT NULL,
    "size" VARCHAR,

    CONSTRAINT "wheel_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_done_component_map_component_mounted_id_idx" ON "public"."action_done_component_map"("component_mounted_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bike_brands_bike_brand_key" ON "public"."bike_brands"("bike_brand" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bike_models_model_name_brand_id_key" ON "public"."bike_models"("model_name" ASC, "brand_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bike_sizes_size_key" ON "public"."bike_sizes"("size" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "bike_types_type_key" ON "public"."bike_types"("type" ASC);

-- CreateIndex
CREATE INDEX "bikes_bike_size_col" ON "public"."bikes"("bike_size_id" ASC);

-- CreateIndex
CREATE INDEX "bikes_created_at" ON "public"."bikes"("created_at" ASC);

-- CreateIndex
CREATE INDEX "bikes_type_id" ON "public"."bikes"("bike_type_id" ASC);

-- CreateIndex
CREATE INDEX "bikes_updated_at" ON "public"."bikes"("updated_at" ASC);

-- CreateIndex
CREATE INDEX "bikes_wheel_size_id" ON "public"."bikes"("wheel_size_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "component_types_component_type_user_id_key" ON "public"."component_types"("component_type" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "bike_components_bike_id" ON "public"."components_mounted"("bike_id" ASC);

-- CreateIndex
CREATE INDEX "bike_components_component_id" ON "public"."components_mounted"("component_type_id" ASC);

-- CreateIndex
CREATE INDEX "bike_components_is_active" ON "public"."components_mounted"("is_active" ASC);

-- CreateIndex
CREATE INDEX "bike_components_mileage" ON "public"."components_mounted"("total_km" ASC);

-- CreateIndex
CREATE INDEX "bike_components_mounted_at" ON "public"."components_mounted"("mounted_at" ASC);

-- CreateIndex
CREATE INDEX "bike_components_remove_at" ON "public"."components_mounted"("removed_at" ASC);

-- CreateIndex
CREATE INDEX "bike_components_updated_at" ON "public"."components_mounted"("updated_at" ASC);

-- CreateIndex
CREATE INDEX "components_mounted_desc_trgm_idx" ON "public"."components_mounted" USING GIN ("component_desc" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "event_actions_done_bike_event_id_idx" ON "public"."event_actions_done"("bike_event_id" ASC);

-- CreateIndex
CREATE INDEX "event_actions_done_event_action_id_idx" ON "public"."event_actions_done"("event_action_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "action_types_action_name_key" ON "public"."events_action"("action_name" ASC);

-- CreateIndex
CREATE INDEX "bike_events_bike_id" ON "public"."events_bikes"("bike_id" ASC);

-- CreateIndex
CREATE INDEX "bike_events_created_at" ON "public"."events_bikes"("created_at" ASC);

-- CreateIndex
CREATE INDEX "bike_events_updated_at" ON "public"."events_bikes"("updated_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "index_1" ON "public"."organization_members"("organization_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_organization_members" ON "public"."organization_members"("organization_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "code" ON "public"."organization_roles"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "jwt_token" ON "public"."refresh_tokens"("refresh_token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ride_styles_ride_style_key" ON "public"."ride_styles"("ride_style" ASC);

-- CreateIndex
CREATE INDEX "rides_bike_id" ON "public"."rides"("bike_id" ASC);

-- CreateIndex
CREATE INDEX "rides_started_at" ON "public"."rides"("started_at" ASC);

-- CreateIndex
CREATE INDEX "users_created_at" ON "public"."users"("created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "public"."users"("googleId" ASC);

-- CreateIndex
CREATE INDEX "users_last_login_at" ON "public"."users"("last_login_at" ASC);

-- CreateIndex
CREATE INDEX "users_name" ON "public"."users"("name" ASC);

-- CreateIndex
CREATE INDEX "users_updated_at" ON "public"."users"("updated_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wheel_sizes_size_key" ON "public"."wheel_sizes"("size" ASC);

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "userid_accountid" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_done_component_map" ADD CONSTRAINT "action_done_component_map_component_mounted_id_fkey" FOREIGN KEY ("component_mounted_id") REFERENCES "public"."components_mounted"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."action_done_component_map" ADD CONSTRAINT "action_done_component_map_event_action_done_id_fkey" FOREIGN KEY ("event_action_done_id") REFERENCES "public"."event_actions_done"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."action_service_intervals" ADD CONSTRAINT "action_service_intervals_event_actions_id_fkey" FOREIGN KEY ("event_actions_id") REFERENCES "public"."events_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bike_event_attachments" ADD CONSTRAINT "bike_event_attachments_bike_event_id_fkey" FOREIGN KEY ("bike_event_id") REFERENCES "public"."events_bikes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bike_models" ADD CONSTRAINT "bike_brands_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."bike_brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bikes" ADD CONSTRAINT "bikes_bike_size_id_fkey" FOREIGN KEY ("bike_size_id") REFERENCES "public"."bike_sizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bikes" ADD CONSTRAINT "bikes_bike_type_id_fkey" FOREIGN KEY ("bike_type_id") REFERENCES "public"."bike_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bikes" ADD CONSTRAINT "bikes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bikes" ADD CONSTRAINT "bikes_ride_style_fkey" FOREIGN KEY ("ride_style_id") REFERENCES "public"."ride_styles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bikes" ADD CONSTRAINT "bikes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bikes" ADD CONSTRAINT "bikes_wheel_size_id_fkey" FOREIGN KEY ("wheel_size_id") REFERENCES "public"."wheel_sizes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."component_types" ADD CONSTRAINT "component_types_component_group_id_fkey" FOREIGN KEY ("component_group_id") REFERENCES "public"."component_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."component_types" ADD CONSTRAINT "component_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."components_mounted" ADD CONSTRAINT "components_mounted_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."components_mounted" ADD CONSTRAINT "components_mounted_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "public"."component_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."event_action_tags" ADD CONSTRAINT "event_action_tags_event_action_id_fkey" FOREIGN KEY ("event_action_id") REFERENCES "public"."events_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_action_targets" ADD CONSTRAINT "event_action_targets_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "public"."component_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_action_targets" ADD CONSTRAINT "event_action_targets_event_action_id_fkey" FOREIGN KEY ("event_action_id") REFERENCES "public"."events_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_actions_done" ADD CONSTRAINT "event_actions_done_bike_event_id_fkey" FOREIGN KEY ("bike_event_id") REFERENCES "public"."events_bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_actions_done" ADD CONSTRAINT "event_actions_done_event_action_id_fkey" FOREIGN KEY ("event_action_id") REFERENCES "public"."events_action"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."events_action" ADD CONSTRAINT "events_action_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."events_bikes" ADD CONSTRAINT "bike_events_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."organization_roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rides" ADD CONSTRAINT "rides_bike_id_fkey" FOREIGN KEY ("bike_id") REFERENCES "public"."bikes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rides" ADD CONSTRAINT "rides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."suspension_setup" ADD CONSTRAINT "suspension_setup_mounted_component_id_fkey" FOREIGN KEY ("mounted_component_id") REFERENCES "public"."components_mounted"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."tire_setup" ADD CONSTRAINT "tire_setup_component_mounted_id_fkey" FOREIGN KEY ("component_mounted_id") REFERENCES "public"."components_mounted"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

