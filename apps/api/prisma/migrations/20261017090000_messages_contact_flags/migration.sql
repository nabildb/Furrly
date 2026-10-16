-- Mensajes privados entre usuarios, contacto opcional en los avisos y denuncias de contenido.
-- La parte estándar la ha generado `prisma migrate diff`; al final va a mano lo que Prisma no expresa.

-- CreateEnum
CREATE TYPE "flag_target" AS ENUM ('report', 'post', 'comment', 'user');

-- CreateEnum
CREATE TYPE "flag_reason" AS ENUM ('spam', 'inappropriate', 'fake', 'other');

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "contact_email" VARCHAR(254),
ADD COLUMN     "contact_phone" VARCHAR(20);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "user_a_read_at" TIMESTAMPTZ,
    "user_b_read_at" TIMESTAMPTZ,
    "last_message_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "report_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_flags" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "flag_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" "flag_reason" NOT NULL,
    "details" VARCHAR(500),
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_user_b_id_idx" ON "conversations"("user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_user_a_id_user_b_id_key" ON "conversations"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "content_flags_resolved_at_created_at_idx" ON "content_flags"("resolved_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_flags_reporter_id_target_type_target_id_key" ON "content_flags"("reporter_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- Reglas de negocio (CHECK)
-- ============================================================
ALTER TABLE "conversations"
  -- La pareja siempre ordenada: junto con el UNIQUE impide dos conversaciones entre las mismas personas
  -- (y hablar con uno mismo).
  ADD CONSTRAINT "conversations_ordered_pair_check" CHECK ("user_a_id" < "user_b_id");

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_body_not_blank_check" CHECK (length(btrim("body")) > 0);

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_contact_email_format_check"
    CHECK ("contact_email" IS NULL OR "contact_email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- ============================================================
-- RLS activado sin políticas, como el resto de tablas: todo pasa por la API.
-- ============================================================
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_flags" ENABLE ROW LEVEL SECURITY;
