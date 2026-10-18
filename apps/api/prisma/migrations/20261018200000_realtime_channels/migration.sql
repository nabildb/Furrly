-- Mensajes en tiempo real: la API "toca el timbre" del destinatario por un canal privado de
-- Supabase Realtime (user:<id>) y la web pide los datos a la API. Por el canal no viaja contenido.
-- Esta política hace que cada usuario solo pueda escuchar SU canal. Solo existe en Supabase
-- (no en la base de datos de los tests), y si faltasen permisos se avisa sin romper el despliegue.
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "furrly: cada usuario escucha solo su canal" ON realtime.messages;
    CREATE POLICY "furrly: cada usuario escucha solo su canal"
      ON realtime.messages FOR SELECT TO authenticated
      USING (
        realtime.messages.extension = 'broadcast'
        AND (SELECT realtime.topic()) = 'user:' || (SELECT auth.uid())::text
      );
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sin permiso para crear la política de realtime.messages: créala desde el panel de Supabase';
END;
$$;
