# Furrly — Red social para mascotas (proyecto de portfolio)

## Contexto
Soy Nabil, estudiante de 2.º DAW (Desarrollo de Aplicaciones Web). Este proyecto es para mi **portfolio**: tiene que demostrar buen backend, base de datos relacional bien diseñada, frontend cuidado y despliegue real.

Prefiero conversar en español.

## La idea
**Furrly** es una red social / comunidad web para dueños de mascotas. Ya existen bastantes (SocialPets, Puppyfy, PawStars, Yummypets...), y casi todas repiten el mismo patrón: perfil por mascota, feed de fotos, mapa pet-friendly, perdidos y adopciones. Ninguna domina, así que el objetivo no es competir sino hacer algo bien hecho y con un enfoque claro.

## Funcionalidades base (MVP)
- Registro e inicio de sesión de usuarios (dueños)
- Un usuario puede tener **varias mascotas**, cada una con su perfil (nombre, especie, raza, edad, foto, descripción)
- Publicaciones con imagen asociadas a una mascota
- Feed, likes y comentarios
- Seguir a otras mascotas

## Posibles enfoques para diferenciarla (elegir uno)
- **Local:** quedadas para pasear en la ciudad + mapa de parques y pipicanes
- **Mascotas perdidas y encontradas:** avisos con ubicación y alertas por zona
- **Comunidad + servicios:** dueños, protectoras y profesionales (veterinarios, peluquerías, cuidadores)

## Decisiones pendientes
- Dominio (comprobar disponibilidad de furrly.app, furrly.pet o similares)

## Decisiones tomadas
- Nombre: **Furrly**
- Enfoque: **mascotas perdidas y encontradas** — avisos con ubicación, avistamientos y alertas por zona
- Frontend: React + Vite + TypeScript + Tailwind
- Diseño visual (UI): hecho con **Claude Design**, elegida la **propuesta C** (colores de la A + tipografía Unbounded/Nunito Sans de la B). Detalle en [docs/diseno.md](docs/diseno.md). **Aplicado** en `apps/web` (16-10-2026)
- Backend: Node + Express + TypeScript + Prisma (API REST propia)
- Base de datos: **Supabase** (PostgreSQL + extensión PostGIS) — proyecto `furrly`, región Frankfurt (eu-central-1)
- Autenticación: **Supabase Auth**. El frontend inicia sesión con el SDK de Supabase y envía el access token (`Authorization: Bearer`) a la API; Express lo valida contra el JWKS del proyecto (librería `jose`) y saca el `sub` como id de usuario
- Imágenes: Supabase Storage
- Despliegue: **todo en Vercel**, un solo proyecto: la web estática y la API de Express como función serverless bajo `/api` (mismo dominio, sin CORS). La BD vive en Supabase
- URL de producción: https://furrly-rouge.vercel.app (el dominio propio sigue pendiente)
- Modelo de datos: ver [docs/modelo-datos.md](docs/modelo-datos.md)

## Estado actual (22-10-2026)
Hecho, probado (100 tests de API, 35 de componentes y 27 end-to-end ×2 —móvil y escritorio— en CI) y desplegado:
- Registro/login con Supabase Auth (+ recuperar contraseña) y **con Google** (username provisional que se confirma en /bienvenida); **páginas legales** (`/aviso-legal`, `/privacidad`, `/cookies`, `/condiciones`; datos del titular en lib/legal.ts, sin banner de cookies porque no hay cookies), perfil editable con zona de alertas, perfil público `/u/:username`, 404
- Mascotas (CRUD con foto en Storage, microchip privado) y carnet con seguidores y publicaciones
- Avisos perdida/encontrada con mapa (Leaflet), búsqueda por radio con PostGIS, editar, resolver/cancelar, "Mis avisos"
- Avistamientos con recorrido en el mapa
- **Contacto y mensajes**: teléfono/email opcionales en el aviso (solo visibles con sesión) y mensajes privados entre usuarios (una conversación por pareja, no leídos calculados, **en tiempo real** con Supabase Realtime y consulta periódica de respaldo)
- **Alertas por zona y notificaciones**: aviso nuevo dentro de tu zona, avistamientos, avisos resueltos, likes, comentarios y seguidores; campana y globos de no leídos
- **Guía de primeros pasos** (`/empezar`, `users.onboarded_at`): zona de alertas, push y mascota; solo cuentas nuevas (las anteriores se marcaron como hechas en la migración). La guarda de cuenta (lib/accountGate.ts) lleva primero a `/bienvenida` si falta el username y luego aquí
- **Coincidencias perdido ↔ encontrado** (lib/matches.ts): notificación `possible_match` a los dos dueños y apartado «Puede que sea el mismo» en la ficha
- **Cartel A4 con QR** (`/avisos/:id/cartel`) y **vista previa al compartir** (vercel.json manda a los robots de WhatsApp, Telegram... a `/api`, que devuelve Open Graph)
- **Comunidad (feed social)**: publicaciones con foto, likes, comentarios y seguir mascotas; "Siguiendo" y "Explorar" con paginación por cursor
- **Avisos push (PWA)**: Web Push implementado a mano (RFC 8291/8292) con test del vector oficial; la web es instalable. Claves VAPID configuradas en Vercel y probado en iPhone
- **Tests del frontend**: Vitest + Testing Library (componentes) y Playwright (end-to-end, móvil y escritorio, API simulada)
- **Moderación**: denunciar avisos, publicaciones, comentarios, usuarios y conversaciones; panel en `/moderacion` (descartar, borrar, suspender cuentas) y borrar la cuenta (RGPD)
- **Diseño C** aplicado (ver docs/diseno.md) y **responsive** (barra lateral en escritorio, dos columnas)
- **Datos de demo** en producción con fotos libres (ver Notas operativas) y README de portfolio con capturas
- **Seguridad en los mensajes**: bloquear usuarios (en los dos sentidos, también likes, comentarios, seguir y avisos), 30 mensajes/hora y 10 conversaciones nuevas/día por usuario, denunciar conversaciones
- **Seguridad de la web** (ver SECURITY.md): SQL siempre parametrizado con guarda en la CI, tests de ataques (inyección SQL, tokens falsos, mass assignment, cuerpos rotos), CSP y cabeceras en Vercel (los e2e corren con la misma CSP), anti open-redirect en el login, CodeQL, Dependabot y `npm audit`
- **Buscar perfiles** (`/buscar`, `GET /users?q=`), **guía de primeros pasos**, **Web Analytics** (sin cookies) y **Sentry** (web y API, sin datos personales)
- **Calidad**: axe (WCAG 2.1 AA) en los e2e, Lighthouse semanal (accesibilidad y SEO 100; rendimiento 80-100, mediana de 3 mediciones), fuentes propias, caché de estáticos, fotos comprimidas en el navegador y sin EXIF/GPS
- **Automatizaciones**: refresco de la demo cada lunes, Lighthouse cada lunes, limpieza nocturna de fotos huérfanas, Dependabot, capturas del README a mano (workflow «Capturas»)
- Rate limiting, validación con zod, RLS sin políticas (todo pasa por la API), CI con GitHub Actions
- Tests solo en CI (servicio PostGIS del workflow); no se instala nada en local
- **Quién soy** (`auth/MeProvider.tsx`, `useMe()`): username y nombre visible salen de `/me`, no del token de Supabase (el token guarda lo del registro y en cuentas de Google no lleva username). Lo usan la barra lateral y las comprobaciones de «es mío» (perfil público, mascota, publicación, aviso, editar aviso, cartel)

### Pendiente
- **Confirmar con un amigo de Google** que ve su nombre en la barra lateral y los botones de editar en sus avisos/mascotas (arreglado en el PR nº 12; solo lo cubre el test)
- **Limpiar datos de prueba de los amigos** cuando terminen de probar (avisos, mascotas, publicaciones que no sean de demo ni de @nabil)
- **Encuesta de feedback**: https://forms.gle/Xa3SoB33fpuB89iX7 (script en docs/feedback/crear-encuesta.gs, sin subir a git). Solo 2 respuestas (notas 5/5 y 4/5; una dijo «No lo sé» a si la usaría y un 7). Esperar 5-8 y convertirlas en mejoras
- **Email de asistencia de Google** (Google Auth Platform → Branding, proyecto `furrly-511911`): cambiarlo a furrly.contacto@gmail.com. Antes hay que dar acceso a esa cuenta en IAM. Los enlaces a /condiciones y /privacidad ya están puestos (22-10-2026)
- **Dominio propio** (~10 €/año): actualizar URLs de Supabase Auth, Google OAuth (orígenes), `PUBLIC_SITE_URL`, `VAPID_SUBJECT`, CSP, capturas y la web del aviso legal (`pages/LegalNotice.tsx`). Con dominio se puede poner logo en la pantalla de Google (requiere verificar la marca)
- Ideas futuras: versión en valenciano/inglés, Apple login si algún día hay cuenta de Apple Developer

### Notas operativas
- Supabase: proyecto `furrly` (ref `dgaiisrusilbieffjcdh`); Auth → URL Configuration ya apunta a la URL de Vercel y a `http://localhost:5173/**`
- Vercel: un proyecto `furrly` conectado a GitHub; cada fusión en `main` despliega y aplica migraciones (`prisma migrate deploy`, solo en producción). Cada PR tiene su **preview** (`furrly-git-<rama>-nabil-7669.vercel.app`, solo visible con sesión en Vercel)
- **Previews y base de datos** (decidido el 20-10-2026): las variables de Supabase están en «Production and Preview», así que **las previews usan la base de datos de producción**. En una preview se prueba sin dejar datos (o se borran después). Un PR con **migración** fallaría en su preview (la migración solo se aplica al fusionar): cuando llegue el primero, montar un segundo proyecto de Supabase para Preview (BD, Auth, Storage y claves) y aplicar ahí las migraciones en el build
- **Login en previews**: Supabase Auth → URL Configuration permite `https://furrly-*-nabil-7669.vercel.app/**` (la web redirige a `window.location.origin`); Google no necesita cambios porque vuelve siempre a Supabase
- **Datos de demo**: `npm run db:seed-demo -w @furrly/api -- --yes` (usa la BD de `apps/api/.env`). Crea 5 vecinos de demo (solo perfiles, sin cuenta en Auth: nadie puede entrar con ellos), 9 mascotas con foto, 8 avisos alrededor de Sol con avistamientos y 11 publicaciones con seguidores, likes y comentarios. Las fotos son de Wikimedia Commons (dominio público / CC0) y están en `apps/web/public/demo` (créditos en `CREDITS.md`); la web las sirve en `/demo/…`. Usa UUIDs fijos (`f0f0f0f0-…`): cada ejecución borra y recrea solo esos datos, con fechas relativas a ese momento. Se repite solo cada lunes (workflow "Refrescar demo", necesita el secreto `DATABASE_URL` en GitHub) y se puede lanzar a mano desde Actions
- **Web Push**: necesita `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en el entorno de la API (en local, `apps/api/.env`; en producción, variables de Vercel). Sin ellas todo funciona menos el push. Se generan con el comando de `apps/api/.env.example`
- **Tests de la web**: solo en la CI (`npm test -w @furrly/web` y `npm run e2e -w @furrly/web`); sus dependencias no se instalan en local. Para añadir dependencias sin instalarlas: `npm install --package-lock-only`
- **Supabase Auth**: contraseña de 8 caracteres mínimo también en el servidor. La protección contra contraseñas filtradas requiere el plan Pro (no activada). El captcha no se activa sin añadirlo antes a los formularios
- **Fotos**: se comprimen en el navegador (lib/compressImage.ts) y llevan una miniatura de 320 px al lado (`<id>-thumb.webp`; la foto pasa a llamarse `<id>-t.webp` y lib/thumbUrl.ts las relaciona, sin tocar la BD; las transformaciones de imagen de Supabase son de pago). Las de demo tienen las suyas en `public/demo/thumbs`. Cron de Vercel a las 4:00 (`/api/cron/storage-cleanup`) que borra las huérfanas de más de un día; necesita `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Vercel
- **Tiempo real** (lib/realtime.ts en API y web): timbre por el canal privado `user:<id>` de Supabase Realtime; usa `SUPABASE_SERVICE_ROLE_KEY`. Política RLS en `realtime.messages` creada por la migración `realtime_channels`
- **Capturas del README**: workflow «Capturas» (apps/web/scripts/capturas.mjs) contra producción; descargar el artefacto y copiarlo a docs/capturas
- **Geocodificación** por la API (`GET /geocode`, caché de Vercel un día) y `cx` con tailwind-merge
- **Sentry** (región UE): `SENTRY_DSN` (API, Secret) y `VITE_SENTRY_DSN` (web, tipo Config: las `VITE_` son públicas) en Vercel; sin ellas no se envía nada. La web solo descarga el SDK (~150 kB) con el primer error, así que los informes no traen breadcrumbs
- **Sentry**: organización `nabil-cc` (región UE, `de.sentry.io`), proyectos `furrly-web` y `furrly-api`, sin guardar IPs. Botón de error de prueba en /moderacion
- **Moderadores**: `UPDATE users SET is_admin = true WHERE username = '...'` en Supabase (ahora solo @nabil)
- **Login con Google**: cliente OAuth en Google Cloud (proyecto `furrly`, Google Auth Platform) con el ID y secreto pegados en Supabase → Sign In / Providers → Google. Apple necesitaría cuenta de Apple Developer (99 €/año); el botón aparecería solo al activarlo en Supabase
- **Dependabot** abre PRs cada semana y tiene activadas las **alertas y actualizaciones de seguridad**; GitHub también escanea secretos y bloquea subirlos (Settings → Advanced Security). Las de versiones mayores se revisan a mano, leyendo el changelog, y no se fusionan a ciegas (así entraron React Router 8 y TypeScript 7; `@types/node` 26 se cerró porque los tipos deben ir con el Node que usamos)
- **Secretos**: en Vercel (VAPID, `SUPABASE_SERVICE_ROLE_KEY` = clave `sb_secret_` «limpieza-fotos», `CRON_SECRET`, `SENTRY_DSN`) y en GitHub (`DATABASE_URL`, sin comillas). Nunca en el repo ni en el chat
- **Lecciones**: probar los componentes **en la página real** (el borrado de cuenta fallaba solo dentro del perfil por un `<form>` anidado; ahora los Sheet van en portal). Los e2e fallan ante cualquier violación de la CSP
- **Rendimiento** (18-10-2026): el mapa en móvil subió de 72 a 80-88 (varía según el día con el mismo código) cargando las páginas bajo demanda, aligerando Nunito Sans y retrasando Sentry 3 s tras el `load` (en una SPA el `load` llega antes que las teselas). El límite ahora son las ~500 kB de teselas de OSM; las de CARTO (más ligeras) piden clave de API
- **Sesiones del 19-22-10-2026**: cron de fotos huérfanas comprobado (borró las 2), Dependabot con alertas y actualizaciones de seguridad activadas (0 alertas), ramas + PRs con ruleset, previews de Vercel documentadas, arreglos del registro (PR nº 10/11) y del nombre visible (PR nº 12), páginas legales (PR nº 14)
- **Lecciones de estas sesiones**: (1) `session.user.user_metadata` no es fiable para datos del perfil: usar `useMe()`. (2) Si GitHub da **502 al fusionar**, el commit puede llegar a `main` sin avisar a Vercel ni a la CI: comprobar el despliegue (hash de `index-*.js`) y, si falta, fusionar otro PR para disparar el push. (3) La sesión de Supabase es **por dominio**: en una preview hay que entrar en esa misma URL. (4) El panel del navegador integrado se oculta y muestra solo (`visibilitychange`), así que ahí se ven refrescos de `/me/inbox` cada pocos segundos que no pasan en un navegador normal. (5) Lighthouse varía entre días: comparar medianas, no una medición
- **Registro** (20-10-2026): el `pattern` del nombre de usuario bloqueaba el envío con una mayúscula, espacio o tilde y solo salía la burbuja genérica del navegador. Ahora `UsernameField` lo corrige al escribir y explica lo que sobra; los errores de Supabase se traducen (lib/authErrors.ts) y no se revela si un email ya tiene cuenta
- Migraciones nuevas: escribir SQL en `apps/api/prisma/migrations/<timestamp>_<nombre>/` (ver las existentes: lo que Prisma no expresa —PostGIS, CHECKs, triggers, RLS— va a mano)

## Cómo quiero trabajar
- Primero, ayudarme a cerrar las decisiones pendientes y diseñar el modelo de datos
- Luego construir el MVP por partes, explicando las decisiones importantes (es para aprender y defenderlo en entrevistas)
- Código limpio, con README y commits ordenados, pensando en que lo vean reclutadores
- **Ramas y PRs** (desde el 20-10-2026): una rama por bloque (`feat/…`, `fix/…`, `docs/…`, `perf/…`), PR hacia `main` con la plantilla, prueba en la preview de Vercel y fusión con **squash** (un commit por bloque en `main`, con el título del PR). El ruleset «Proteger main» impide subir directamente a `main`, exige la CI (API, web, e2e y CodeQL) y solo permite squash; la rama se borra al fusionar
