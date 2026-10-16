-- ============================================================
-- Bucket "media" de Supabase Storage para las fotos (mascotas, posts, avisos).
--
-- El frontend sube las imágenes directamente a Storage con el token del usuario;
-- la API solo guarda la URL pública (y comprueba que apunta a la carpeta del usuario).
-- Ruta de cada archivo: <user_id>/<tipo>/<uuid>.<ext>
-- ============================================================

-- El schema storage solo existe en Supabase (no en la shadow database de Prisma).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('media', 'media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO NOTHING;

    -- Cada usuario solo puede escribir dentro de su propia carpeta.
    DROP POLICY IF EXISTS "media: subir a tu carpeta" ON storage.objects;
    CREATE POLICY "media: subir a tu carpeta" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

    DROP POLICY IF EXISTS "media: modificar tu carpeta" ON storage.objects;
    CREATE POLICY "media: modificar tu carpeta" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

    DROP POLICY IF EXISTS "media: borrar de tu carpeta" ON storage.objects;
    CREATE POLICY "media: borrar de tu carpeta" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

    -- Necesaria para que remove() encuentre los archivos propios.
    DROP POLICY IF EXISTS "media: ver tu carpeta" ON storage.objects;
    CREATE POLICY "media: ver tu carpeta" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
  END IF;
END;
$$;
