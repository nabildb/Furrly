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
- Diseño visual (UI): se hará más adelante con **Claude Design**; hasta entonces, el frontend será funcional con estilos mínimos
- Backend: Node + Express + TypeScript + Prisma (API REST propia)
- Base de datos: **Supabase** (PostgreSQL + extensión PostGIS)
- Autenticación: **Supabase Auth**. El frontend inicia sesión con el SDK de Supabase y envía el access token (`Authorization: Bearer`) a la API; Express lo valida contra el JWKS del proyecto (librería `jose`) y saca el `sub` como id de usuario
- Imágenes: Supabase Storage
- Despliegue: Vercel (frontend) + Render/Railway (API); la BD vive en Supabase
- Modelo de datos: ver [docs/modelo-datos.md](docs/modelo-datos.md)

## Cómo quiero trabajar
- Primero, ayudarme a cerrar las decisiones pendientes y diseñar el modelo de datos
- Luego construir el MVP por partes, explicando las decisiones importantes (es para aprender y defenderlo en entrevistas)
- Código limpio, con README y commits ordenados, pensando en que lo vean reclutadores
