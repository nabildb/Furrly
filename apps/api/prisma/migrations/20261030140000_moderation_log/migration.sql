-- Registro de moderación: quién hizo qué, a quién y por qué. Lo afectado va copiado en target_label
-- porque el registro debe seguir siendo legible cuando eso ya no exista.
CREATE TYPE "moderation_action" AS ENUM ('remove', 'dismiss', 'warn', 'suspend', 'unsuspend', 'delete_account', 'clean_profile', 'purge_content');

CREATE TABLE "moderation_log" (
    "id" UUID NOT NULL,
    "moderator_id" UUID,
    "action" "moderation_action" NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID,
    "target_label" VARCHAR(200) NOT NULL,
    "target_user_id" UUID,
    "reason" "flag_reason",
    "note" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_log_created_at_idx" ON "moderation_log" ("created_at" DESC);
CREATE INDEX "moderation_log_moderator_id_idx" ON "moderation_log" ("moderator_id");
CREATE INDEX "moderation_log_target_user_id_created_at_idx" ON "moderation_log" ("target_user_id", "created_at" DESC);

ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "moderation_log" ADD CONSTRAINT "moderation_log_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Como el resto de tablas: sin políticas, solo la API puede leerla.
ALTER TABLE "moderation_log" ENABLE ROW LEVEL SECURITY;

-- Aviso al afectado: lleva su propio texto y no tiene autor.
ALTER TABLE "notifications" ADD COLUMN "message" VARCHAR(300);
ALTER TYPE "notification_type" ADD VALUE 'moderation_notice';
