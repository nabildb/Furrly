-- ============================================================
-- Migración inicial de Furrly
-- Parte generada por Prisma (prisma migrate diff) + SQL manual
-- para lo que Prisma no expresa: PostGIS, CHECKs, triggers y RLS.
-- ============================================================

-- PostGIS. En Supabase las extensiones viven en el schema "extensions".
-- El SET search_path es para la shadow database de `prisma migrate dev`,
-- que no tiene la configuración de Supabase.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET search_path TO public, extensions;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "species" AS ENUM ('dog', 'cat', 'rabbit', 'bird', 'other');

-- CreateEnum
CREATE TYPE "pet_sex" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "report_type" AS ENUM ('lost', 'found');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('active', 'resolved', 'cancelled');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('new_report_nearby', 'new_sighting', 'report_resolved', 'new_follower', 'new_comment', 'new_like');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "display_name" VARCHAR(60) NOT NULL,
    "avatar_url" TEXT,
    "bio" VARCHAR(300),
    "alert_location" geography(Point, 4326),
    "alert_radius_km" SMALLINT NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "species" "species" NOT NULL,
    "breed" VARCHAR(60),
    "sex" "pet_sex" NOT NULL DEFAULT 'unknown',
    "birth_date" DATE,
    "color" VARCHAR(60),
    "description" VARCHAR(500),
    "photo_url" TEXT,
    "microchip" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","pet_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "type" "report_type" NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'active',
    "reporter_id" UUID NOT NULL,
    "pet_id" UUID,
    "species" "species" NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "address_text" VARCHAR(200),
    "happened_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_photos" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "position" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "report_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sightings" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "seen_at" TIMESTAMPTZ NOT NULL,
    "note" VARCHAR(300),
    "photo_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sightings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "actor_id" UUID,
    "report_id" UUID,
    "post_id" UUID,
    "pet_id" UUID,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_alert_location_idx" ON "users" USING GIST ("alert_location");

-- CreateIndex
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");

-- CreateIndex
CREATE INDEX "follows_pet_id_idx" ON "follows"("pet_id");

-- CreateIndex
CREATE INDEX "posts_pet_id_created_at_idx" ON "posts"("pet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "likes_post_id_idx" ON "likes"("post_id");

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_location_idx" ON "reports" USING GIST ("location");

-- CreateIndex
CREATE INDEX "reports_status_happened_at_idx" ON "reports"("status", "happened_at" DESC);

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_photos_report_id_position_key" ON "report_photos"("report_id", "position");

-- CreateIndex
CREATE INDEX "sightings_report_id_seen_at_idx" ON "sightings"("report_id", "seen_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_photos" ADD CONSTRAINT "report_photos_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Reglas de negocio (CHECK)
-- ============================================================
ALTER TABLE "users"
  ADD CONSTRAINT "users_alert_radius_km_check" CHECK ("alert_radius_km" BETWEEN 1 AND 50),
  ADD CONSTRAINT "users_username_format_check" CHECK ("username" ~ '^[a-z0-9_]{3,30}$');

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_lost_has_pet_check" CHECK ("type" <> 'lost' OR "pet_id" IS NOT NULL),
  ADD CONSTRAINT "reports_resolved_at_check" CHECK (("status" = 'resolved') = ("resolved_at" IS NOT NULL));

-- ============================================================
-- Sincronización con Supabase Auth
-- Al registrarse un usuario en auth.users se crea su perfil en public.users
-- con el username y display_name enviados en signUp({ options: { data } }).
-- Al borrar la cuenta se borra el perfil (y en cascada todo lo suyo).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name)
  VALUES (
    NEW.id,
    lower(NEW.raw_user_meta_data ->> 'username'),
    coalesce(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- El schema auth y los roles anon/authenticated solo existen en Supabase
-- (no en la shadow database de Prisma).
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

    DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
    CREATE TRIGGER on_auth_user_deleted
      AFTER DELETE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();

    -- Son funciones de trigger: nadie debe poder llamarlas vía RPC.
    REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.handle_deleted_auth_user() FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;

-- ============================================================
-- Row Level Security
-- RLS activado SIN políticas: la API REST automática de Supabase (anon key)
-- no puede leer ni escribir nada. Todo el acceso pasa por nuestra API,
-- que se conecta con un rol que ignora RLS.
-- ============================================================
ALTER TABLE "users"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pets"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follows"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "likes"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sightings"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
