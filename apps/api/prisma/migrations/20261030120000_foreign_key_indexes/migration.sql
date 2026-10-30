-- Índices de las claves foráneas que no tenían. Postgres no los crea solo, y al borrar una fila
-- padre (una cuenta, un aviso, una publicación) tiene que recorrer entera cada tabla hija para
-- aplicar el ON DELETE. Hoy las tablas son pequeñas: se añaden antes de que eso se note.
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");
CREATE INDEX "reports_pet_id_idx" ON "reports"("pet_id");
CREATE INDEX "sightings_user_id_idx" ON "sightings"("user_id");
CREATE INDEX "notifications_actor_id_idx" ON "notifications"("actor_id");
CREATE INDEX "notifications_report_id_idx" ON "notifications"("report_id");
CREATE INDEX "notifications_post_id_idx" ON "notifications"("post_id");
CREATE INDEX "notifications_pet_id_idx" ON "notifications"("pet_id");
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX "messages_report_id_idx" ON "messages"("report_id");
