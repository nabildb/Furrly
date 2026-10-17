-- Registro con Google/Apple: Supabase crea el usuario sin el username que pide nuestro formulario.
-- El trigger le pone uno provisional y la web le pide que lo confirme la primera vez que entra.

ALTER TABLE "users" ADD COLUMN "username_confirmed" BOOLEAN NOT NULL DEFAULT true;

-- Username libre a partir de un texto (la parte del email antes de la @): "José.Pérez" → "jose_perez",
-- y si ya existe, con un número detrás ("jose_perez_4821"). Siempre cumple el CHECK de formato.
CREATE OR REPLACE FUNCTION public.suggest_username(seed text)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base text := left(
    trim(BOTH '_' FROM regexp_replace(translate(lower(coalesce(seed, '')), 'áàäéèëíìïóòöúùüñç', 'aaaeeeiiiooouuunc'), '[^a-z0-9_]+', '_', 'g')),
    24
  );
  candidate text;
BEGIN
  IF length(base) < 3 THEN
    base := 'vecino';
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = candidate) LOOP
    candidate := base || '_' || (1000 + floor(random() * 9000)::int);
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  wanted text := lower(meta ->> 'username');
BEGIN
  IF wanted IS NOT NULL THEN
    -- Registro con email: el username lo ha elegido en el formulario.
    INSERT INTO public.users (id, username, display_name)
    VALUES (NEW.id, wanted, coalesce(meta ->> 'display_name', wanted));
  ELSE
    -- Google/Apple: nombre del proveedor y username provisional, pendiente de confirmar.
    INSERT INTO public.users (id, username, display_name, username_confirmed)
    VALUES (
      NEW.id,
      public.suggest_username(coalesce(split_part(NEW.email, '@', 1), meta ->> 'full_name')),
      left(coalesce(nullif(trim(meta ->> 'full_name'), ''), nullif(trim(meta ->> 'name'), ''), split_part(NEW.email, '@', 1), 'Vecino'), 60),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suggest_username(text) FROM PUBLIC;
DO $$
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.suggest_username(text) FROM anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;
