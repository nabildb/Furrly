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

## Estado actual (17-10-2026)
Hecho, probado (75 tests de API, 23 de componentes y 14 end-to-end en CI) y desplegado:
- Registro/login con Supabase Auth (+ recuperar contraseña) y **con Google** (username provisional que se confirma en /bienvenida); página de privacidad en /privacidad, perfil editable con zona de alertas, perfil público `/u/:username`, 404
- Mascotas (CRUD con foto en Storage, microchip privado) y carnet con seguidores y publicaciones
- Avisos perdida/encontrada con mapa (Leaflet), búsqueda por radio con PostGIS, editar, resolver/cancelar, "Mis avisos"
- Avistamientos con recorrido en el mapa
- **Contacto y mensajes**: teléfono/email opcionales en el aviso (solo visibles con sesión) y mensajes privados entre usuarios (una conversación por pareja, no leídos calculados, polling)
- **Alertas por zona y notificaciones**: aviso nuevo dentro de tu zona, avistamientos, avisos resueltos, likes, comentarios y seguidores; campana y globos de no leídos
- **Comunidad (feed social)**: publicaciones con foto, likes, comentarios y seguir mascotas; "Siguiendo" y "Explorar" con paginación por cursor
- **Avisos push (PWA)**: Web Push implementado a mano (RFC 8291/8292) con test del vector oficial; la web es instalable. Claves VAPID configuradas en Vercel y probado en iPhone
- **Tests del frontend**: Vitest + Testing Library (componentes) y Playwright (end-to-end, móvil y escritorio, API simulada)
- **Moderación**: denunciar avisos, publicaciones, comentarios y usuarios (tabla `content_flags`, se revisa desde Supabase) y borrar la cuenta (RGPD)
- **Diseño C** aplicado (ver docs/diseno.md) y **responsive** (barra lateral en escritorio, dos columnas)
- **Datos de demo** en producción con fotos libres (ver Notas operativas) y README de portfolio con capturas
- **Seguridad en los mensajes**: bloquear usuarios (en los dos sentidos, también likes, comentarios, seguir y avisos), 30 mensajes/hora y 10 conversaciones nuevas/día por usuario, denunciar conversaciones
- **Seguridad de la web** (ver SECURITY.md): SQL siempre parametrizado con guarda en la CI, tests de ataques (inyección SQL, tokens falsos, mass assignment, cuerpos rotos), CSP y cabeceras en Vercel (los e2e corren con la misma CSP), anti open-redirect en el login, CodeQL, Dependabot y `npm audit`
- Rate limiting, validación con zod, RLS sin políticas (todo pasa por la API), CI con GitHub Actions
- Tests solo en CI (servicio PostGIS del workflow); no se instala nada en local

### Hoja de ruta (de más a menos importante)
1. **Fotos más ligeras y sin huérfanas**: comprimir en el navegador antes de subir y una tarea periódica que borre de Storage lo que ya no se usa
2. **Panel de moderación**: revisar las denuncias desde la app (rol de administrador) en vez de desde Supabase
3. **Auditoría de accesibilidad y rendimiento** (Lighthouse/axe) y poner la puntuación en el README
4. **Refresco automático de la demo**: GitHub Action semanal que ejecute `db:seed-demo`
5. **Dominio propio** (actualizando las URLs de Supabase Auth)
6. **Pulido técnico**: `tailwind-merge`, geocodificación a través de la API y Sentry para errores en producción

### Notas operativas
- Supabase: proyecto `furrly` (ref `dgaiisrusilbieffjcdh`); Auth → URL Configuration ya apunta a la URL de Vercel y a `http://localhost:5173/**`
- Vercel: un proyecto `furrly` conectado a GitHub; cada push a `main` despliega y aplica migraciones (`prisma migrate deploy`)
- **Datos de demo**: `npm run db:seed-demo -w @furrly/api -- --yes` (usa la BD de `apps/api/.env`). Crea 5 vecinos de demo (solo perfiles, sin cuenta en Auth: nadie puede entrar con ellos), 9 mascotas con foto, 8 avisos alrededor de Sol con avistamientos y 11 publicaciones con seguidores, likes y comentarios. Las fotos son de Wikimedia Commons (dominio público / CC0) y están en `apps/web/public/demo` (créditos en `CREDITS.md`); la web las sirve en `/demo/…`. Usa UUIDs fijos (`f0f0f0f0-…`): cada ejecución borra y recrea solo esos datos, con fechas relativas a ese momento. Conviene repetirlo de vez en cuando para que la demo no envejezca
- **Web Push**: necesita `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en el entorno de la API (en local, `apps/api/.env`; en producción, variables de Vercel). Sin ellas todo funciona menos el push. Se generan con el comando de `apps/api/.env.example`
- **Tests de la web**: solo en la CI (`npm test -w @furrly/web` y `npm run e2e -w @furrly/web`); sus dependencias no se instalan en local. Para añadir dependencias sin instalarlas: `npm install --package-lock-only`
- **Supabase Auth**: contraseña de 8 caracteres mínimo también en el servidor. La protección contra contraseñas filtradas requiere el plan Pro (no activada). El captcha no se activa sin añadirlo antes a los formularios
- **Login con Google**: cliente OAuth en Google Cloud (proyecto `furrly`, Google Auth Platform) con el ID y secreto pegados en Supabase → Sign In / Providers → Google. Apple necesitaría cuenta de Apple Developer (99 €/año); el botón aparecería solo al activarlo en Supabase
- **Dependabot** abre PRs cada semana: las de versiones mayores (React Router 8, TypeScript 7…) se revisan a mano, no se fusionan a ciegas
- Migraciones nuevas: escribir SQL en `apps/api/prisma/migrations/<timestamp>_<nombre>/` (ver las existentes: lo que Prisma no expresa —PostGIS, CHECKs, triggers, RLS— va a mano)

## Cómo quiero trabajar
- Primero, ayudarme a cerrar las decisiones pendientes y diseñar el modelo de datos
- Luego construir el MVP por partes, explicando las decisiones importantes (es para aprender y defenderlo en entrevistas)
- Código limpio, con README y commits ordenados, pensando en que lo vean reclutadores
