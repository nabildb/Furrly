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
- Diseño visual (UI): hecho con **Claude Design**, elegida la **propuesta C** (colores de la A + tipografía Unbounded/Nunito Sans de la B). Detalle en [docs/diseno.md](docs/diseno.md). **Pendiente de aplicar al código**
- Backend: Node + Express + TypeScript + Prisma (API REST propia)
- Base de datos: **Supabase** (PostgreSQL + extensión PostGIS) — proyecto `furrly`, región Frankfurt (eu-central-1)
- Autenticación: **Supabase Auth**. El frontend inicia sesión con el SDK de Supabase y envía el access token (`Authorization: Bearer`) a la API; Express lo valida contra el JWKS del proyecto (librería `jose`) y saca el `sub` como id de usuario
- Imágenes: Supabase Storage
- Despliegue: **todo en Vercel**, un solo proyecto: la web estática y la API de Express como función serverless bajo `/api` (mismo dominio, sin CORS). La BD vive en Supabase
- URL de producción: https://furrly-rouge.vercel.app (el dominio propio sigue pendiente)
- Modelo de datos: ver [docs/modelo-datos.md](docs/modelo-datos.md)

## Estado actual (16-10-2026)
Hecho, probado (34 tests de integración en CI) y desplegado:
- Registro/login con Supabase Auth (+ recuperar contraseña), perfil editable con zona de alertas, perfil público `/u/:username`, 404
- Mascotas (CRUD con foto en Storage, microchip privado)
- Avisos perdida/encontrada con mapa (Leaflet), búsqueda por radio con PostGIS, editar, resolver/cancelar, "Mis avisos"
- Avistamientos con recorrido en el mapa
- Rate limiting, validación con zod, RLS sin políticas (todo pasa por la API), CI con GitHub Actions
- Tests solo en CI (servicio PostGIS del workflow); no se instala nada en local

### Próximos pasos
1. **Aplicar el diseño C** a `apps/web` (ver docs/diseno.md, sección "Cómo aplicarlo")
2. Alertas por zona y notificaciones (la tabla `notifications` y `users.alert_location` ya existen)
3. Feed social: publicaciones, likes, comentarios, seguir mascotas (tablas ya creadas)
4. Dominio propio
5. Limpieza de fotos huérfanas en Storage (p. ej. al borrar avistamientos ajenos)

### Notas operativas
- Supabase: proyecto `furrly` (ref `dgaiisrusilbieffjcdh`); Auth → URL Configuration ya apunta a la URL de Vercel y a `http://localhost:5173/**`
- Vercel: un proyecto `furrly` conectado a GitHub; cada push a `main` despliega y aplica migraciones (`prisma migrate deploy`)
- Migraciones nuevas: escribir SQL en `apps/api/prisma/migrations/<timestamp>_<nombre>/` (ver las existentes: lo que Prisma no expresa —PostGIS, CHECKs, triggers, RLS— va a mano)

## Cómo quiero trabajar
- Primero, ayudarme a cerrar las decisiones pendientes y diseñar el modelo de datos
- Luego construir el MVP por partes, explicando las decisiones importantes (es para aprender y defenderlo en entrevistas)
- Código limpio, con README y commits ordenados, pensando en que lo vean reclutadores
