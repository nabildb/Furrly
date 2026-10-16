# Furrly 🐾

Comunidad web para dueños de mascotas, centrada en **mascotas perdidas y encontradas**: avisos geolocalizados, avistamientos y alertas a los vecinos de la zona.

> Proyecto de portfolio — 2.º DAW. En desarrollo.

## Funcionalidades

- Registro e inicio de sesión (Supabase Auth); el perfil se crea con un trigger en la BD
- Perfiles de mascotas con foto (subida directa a Supabase Storage)
- Avisos de mascota **perdida** o **encontrada** con ubicación en el mapa y fotos
- Mapa y listado de avisos activos en un radio, con filtros (búsqueda geoespacial con PostGIS)
- **Avistamientos** ("la he visto aquí") que dibujan el recorrido de la mascota en el mapa
- Cerrar avisos como resueltos o cancelados

Próximamente: alertas por zona y notificaciones, feed social (publicaciones, likes, comentarios, seguir mascotas) y despliegue.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| API | Node + Express 5 + TypeScript |
| ORM | Prisma 7 (driver adapter `pg`) |
| Base de datos | PostgreSQL + PostGIS en Supabase |
| Autenticación | Supabase Auth (la API valida el JWT con JWKS) |
| Imágenes | Supabase Storage |
| Mapas | Leaflet + OpenStreetMap |

## Estructura

```
apps/
  web/   → frontend (React)
  api/   → API REST (Express + Prisma)
    prisma/schema.prisma   → modelo de datos
    prisma/migrations/     → migraciones SQL (incluye PostGIS, CHECKs, triggers y RLS)
docs/
  modelo-datos.md          → diseño de la base de datos y decisiones
```

## Puesta en marcha

Requisitos: Node 22+ y un proyecto de Supabase.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # rellenar con los datos de Supabase
cp apps/web/.env.example apps/web/.env
npm run db:deploy -w @furrly/api         # aplica las migraciones
npm run dev:api
npm run dev:web
```

## Documentación

- [Modelo de datos](docs/modelo-datos.md)
- [Contexto y decisiones del proyecto](furrly.md)
