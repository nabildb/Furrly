# Seguridad en Furrly

Qué ataques se han tenido en cuenta, cómo se evitan y dónde se comprueba. Si encuentras un fallo,
abre un *security advisory* privado en GitHub (pestaña **Security**) en vez de un issue público.

## Resumen

| Ataque | Defensa | Comprobado en |
|---|---|---|
| Inyección SQL | Consultas siempre parametrizadas (Prisma y `$queryRaw` con plantillas) | [security.test.ts](apps/api/test/security.test.ts) + guarda en la CI |
| Suplantar a otro usuario | JWT de Supabase verificado con JWKS (firma, emisor, audiencia, caducidad) | [security.test.ts](apps/api/test/security.test.ts) |
| Leer o tocar datos ajenos | Comprobación de dueño en cada ruta; RLS sin políticas en la base de datos | tests de cada recurso |
| *Mass assignment* | Esquemas `zod` que descartan los campos que no esperan | [security.test.ts](apps/api/test/security.test.ts) |
| XSS | React escapa todo; el HTML de los marcadores del mapa se escapa a mano; CSP estricta | [format.test.ts](apps/web/src/lib/format.test.ts) + e2e con la CSP activa |
| *Clickjacking* | `frame-ancestors 'none'` y `X-Frame-Options: DENY` | [vercel.json](vercel.json) |
| Redirección abierta | `?next=` del login solo acepta rutas internas | [redirect.test.ts](apps/web/src/lib/redirect.test.ts) |
| SSRF | Los avisos push solo se envían a servicios de push conocidos por HTTPS | [push.test.ts](apps/api/test/push.test.ts) |
| Spam y acoso | Límites por IP y por usuario, bloqueos y denuncias | [blocks.test.ts](apps/api/test/blocks.test.ts) |
| Peticiones enormes o rotas | Cuerpo JSON de 100 kB como máximo; responde 400/413, nunca 500 | [security.test.ts](apps/api/test/security.test.ts) |
| Dependencias vulnerables | `npm audit` en la CI, Dependabot y CodeQL | [ci.yml](.github/workflows/ci.yml), [codeql.yml](.github/workflows/codeql.yml) |

## Base de datos

- **Sin SQL concatenado.** Todo pasa por Prisma o por `$queryRaw`/`$executeRaw` como *tagged template*,
  que envía los valores como parámetros (`$1`, `$2`…) y nunca como texto de la consulta.
  La CI **falla si alguien usa `$queryRawUnsafe` o `$executeRawUnsafe`**.
- Los tests mandan cargas típicas (`' OR 1=1 --`, `'; DROP TABLE users; --`…) en rutas, parámetros y textos,
  y comprueban que se guardan tal cual o se rechazan, y que la base de datos sigue intacta.
- **RLS activado sin políticas** en todas las tablas: con la clave pública de Supabase no se puede leer ni escribir nada
  directamente. Solo la API, con su propio usuario, accede a los datos.
- Las reglas importantes están también en la base de datos (`CHECK`, claves únicas, `ON DELETE CASCADE`),
  así que un fallo en la API no deja datos incoherentes.

## Autenticación y permisos

- El login lo hace Supabase Auth. La API **no guarda contraseñas**: valida el JWT con las claves públicas
  del proyecto (JWKS), comprobando firma, emisor, audiencia `authenticated` y caducidad.
  Se rechazan tokens con `alg: none`, firmados con otra clave o modificados.
- No se usan cookies (el token va en la cabecera `Authorization`), así que **no hay riesgo de CSRF**.
- Cada ruta comprueba que el recurso es tuyo. Si no lo es, responde **404** (no 403), para no revelar qué existe.
- Datos privados por defecto: el microchip solo lo ve el dueño, la zona de alertas nunca es pública
  y el teléfono/email de un aviso solo se ve con sesión.

## Entrada de datos

- Todo cuerpo, parámetro y *query* se valida con `zod`: tipos, longitudes máximas, formatos (UUID, email, URL)
  y rangos (coordenadas, radios). Los campos que no están en el esquema se descartan, así que no se puede
  colar `userId`, `status` o `createdAt`.
- Las fotos se **redibujan en el navegador** antes de subirlas: así se eliminan los metadatos EXIF, incluida la
  ubicación GPS de donde se hizo la foto (que en una foto hecha en casa revelaría dónde vive el usuario).
- Las fotos solo se aceptan si son URLs de **la carpeta del propio usuario** en Supabase Storage. El bucket solo deja
  subir a tu carpeta, imágenes jpg/png/webp y de 5 MB como máximo.

## Mensajes

- Solo los dos participantes pueden leer o escribir en una conversación.
- **Tiempo real:** el aviso de mensaje nuevo va por el canal privado de Supabase Realtime de cada usuario. Una política RLS
  en `realtime.messages` hace que solo él pueda escucharlo, y por el canal no viaja el contenido: solo el id de la conversación.
- **Bloquear** a alguien impide escribirse en ambos sentidos, comentar, dar like o seguir sus mascotas,
  y deja de notificarte lo que hace. El bloqueado no sabe que lo han bloqueado.
- **Límites anti-spam por usuario:** 30 mensajes por hora y 10 conversaciones nuevas al día
  (contestar a quien te escribe no cuenta).
- Se puede **denunciar una conversación**, pero solo quien participa en ella.

## Tareas programadas

- La limpieza nocturna de fotos (`/api/cron/storage-cleanup`) solo la puede lanzar Vercel Cron: exige el
  `CRON_SECRET` (comparación en tiempo constante) y responde 401 a cualquier otra llamada.
- La clave de servicio de Supabase (`SUPABASE_SERVICE_ROLE_KEY`) solo existe en las variables de entorno del servidor
  y solo se usa para borrar fotos huérfanas; nunca llega al navegador.

## Errores en producción (Sentry)

- La web y la API envían a Sentry (región UE) los errores inesperados para poder arreglarlos. Solo los 500 de la API:
  los 400/404 son errores de quien hace la petición.
- Sentry 11 recoge por defecto cabeceras, cuerpos, cookies, consultas SQL y variables locales: todo eso está **apagado**
  (`dataCollection`), se borra cualquier dato de usuario y se quita la query de las URLs. Un test lo comprueba.
- Sin `SENTRY_DSN` / `VITE_SENTRY_DSN` no se envía nada (local y tests).

## Moderación

- Los moderadores (`users.is_admin`) solo se pueden nombrar desde la base de datos: la API ignora ese campo
  si alguien intenta enviarlo.
- Una cuenta suspendida no puede usar la API aunque su token no haya caducado (se comprueba en cada petición)
  ni volver a entrar: se le pone `banned_until` en Supabase Auth y se cierran sus sesiones.
- Las conversaciones privadas solo las puede leer un moderador si alguien que participa en ellas la ha denunciado.

## Navegador

Cabeceras en [vercel.json](vercel.json):

- **Content-Security-Policy**: scripts solo del propio dominio (nada de `eval` ni scripts en línea);
  imágenes, conexiones y fuentes solo de los orígenes que usa la app (Supabase, OpenStreetMap, Google Fonts).
  `style-src` necesita `'unsafe-inline'` porque Leaflet coloca los marcadores con estilos en línea.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
  (solo geolocalización, para el mapa) y `Cross-Origin-Opener-Policy`.
- La API añade las suyas con `helmet`.
- Los tests end-to-end corren **con la misma CSP** que producción, así que si algo la incumple, la CI falla.

## Límites de peticiones

- Por IP: 300 peticiones cada 15 minutos y 60 escrituras cada 15 minutos.
- Por usuario: los de mensajes de arriba.

## Avisos push

- El cifrado (RFC 8291) y la firma VAPID (RFC 8292) están hechos con `node:crypto` y se prueban con el vector oficial del RFC.
- Solo se aceptan suscripciones a `fcm.googleapis.com`, `push.services.mozilla.com`, `push.apple.com`
  y `notify.windows.com` por HTTPS: nadie puede usar la API para hacer peticiones a la red interna (SSRF).
- La clave privada VAPID solo está en las variables de entorno de Vercel, nunca en el repositorio.

## Cuenta

- Borrar la cuenta elimina el usuario de Supabase Auth y, en cascada, todos sus datos (RGPD).

## Automatizado en cada push

- Tests de ataques en la API contra un PostgreSQL real.
- Guarda contra SQL sin parámetros.
- `npm audit --omit=dev --audit-level=high`: falla si una dependencia de producción tiene una vulnerabilidad alta.
- **CodeQL** (`security-extended`) analiza el código en busca de vulnerabilidades.
- **Dependabot** propone actualizaciones de dependencias cada semana y avisa en cuanto se publica una vulnerabilidad
  (alertas y actualizaciones de seguridad activadas). GitHub escanea además el repositorio en busca de secretos y bloquea subirlos.

## Contraseñas (configuración de Supabase Auth)

- Mínimo de **8 caracteres**, exigido por el formulario y también por Supabase Auth en el servidor.
- La **protección contra contraseñas filtradas** (comprobar contra Have I Been Pwned) requiere el plan Pro de Supabase;
  el proyecto está en el plan gratuito, así que no está activada.
- El captcha está desactivado a propósito: activarlo exige mostrarlo en los formularios de registro y login.
