-- Panel de moderación: administradores y cuentas suspendidas.
-- is_admin no se puede cambiar desde la API: se activa a mano en la base de datos.
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "suspended_at" TIMESTAMPTZ;

-- La lista de pendientes se pide agrupada por contenido.
CREATE INDEX "content_flags_target_idx" ON "content_flags" ("target_type", "target_id");
