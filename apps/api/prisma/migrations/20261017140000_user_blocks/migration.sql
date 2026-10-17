-- Bloqueos entre usuarios y denuncias de conversaciones.
-- La parte estándar la ha generado `prisma migrate diff`; al final va a mano lo que Prisma no expresa.

-- AlterEnum
ALTER TYPE "flag_target" ADD VALUE 'conversation';

-- CreateTable
CREATE TABLE "user_blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateIndex
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- No se puede bloquear a uno mismo.
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_not_self_check" CHECK ("blocker_id" <> "blocked_id");

-- RLS activado sin políticas, como el resto de tablas: todo pasa por la API.
ALTER TABLE "user_blocks" ENABLE ROW LEVEL SECURITY;
