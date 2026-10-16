-- Un aviso de pérdida siempre tiene mascota (CHECK reports_lost_has_pet_check),
-- así que SET NULL hacía fallar el borrado de una mascota con avisos.
-- Si se borra la mascota, sus avisos dejan de tener sentido: se borran con ella.

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_pet_id_fkey";

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
