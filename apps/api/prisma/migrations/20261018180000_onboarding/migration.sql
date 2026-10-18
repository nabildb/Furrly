-- Guía de primeros pasos (zona de alertas, avisos push, mascota). Solo para cuentas nuevas:
-- las que ya existían se dan por hechas.
ALTER TABLE "users" ADD COLUMN "onboarded_at" TIMESTAMPTZ;
UPDATE "users" SET "onboarded_at" = now();
