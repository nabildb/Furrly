# Furrly 🐾

[![CI](https://github.com/nabildb/Furrly/actions/workflows/ci.yml/badge.svg)](https://github.com/nabildb/Furrly/actions/workflows/ci.yml)

Red social para dueños de mascotas centrada en lo que más importa cuando algo sale mal:
**encontrar mascotas perdidas**. Avisos geolocalizados, avistamientos que dibujan el recorrido del animal,
alertas a los vecinos de la zona y mensajes para coordinarse. Y, el resto del tiempo, una comunidad
para compartir fotos de tus mascotas.

**🌐 Demo:** https://furrly-rouge.vercel.app &nbsp;·&nbsp; Proyecto de portfolio de 2.º de DAW

<p align="center">
  <img src="docs/capturas/mapa.jpg" alt="Mapa de avisos cerca" width="230">
  <img src="docs/capturas/coincidencias.jpg" alt="Ficha de un perro perdido con un posible encontrado cerca" width="230">
  <img src="docs/capturas/comunidad.jpg" alt="Feed de la comunidad" width="230">
</p>
<p align="center">
  <img src="docs/capturas/escritorio.jpg" alt="Mapa y lista de avisos en escritorio" width="560">
  <img src="docs/capturas/cartel.jpg" alt="Cartel A4 para imprimir con código QR" width="250">
</p>
<p align="center"><sub>Capturas hechas contra producción con Playwright (workflow <a href=".github/workflows/capturas.yml">Capturas</a>).</sub></p>

> Móvil primero; en escritorio la navegación pasa a una barra lateral y las páginas a dos columnas.
> La demo tiene datos de ejemplo (vecinos, mascotas, avisos y publicaciones alrededor de Madrid centro).
> Puedes explorarla sin cuenta o registrarte para publicar, avisar de un avistamiento o escribir mensajes.

## Qué se puede hacer

**Mascotas perdidas y encontradas**
- Publicar un aviso de **perdida** o **encontrada** con un asistente de 3 pasos: qué ha pasado, dónde y cuándo, y detalles con fotos.
- **Mapa a pantalla completa** con los avisos activos en un radio, filtros por tipo y especie, y búsqueda de zonas.
- **"La he visto"**: los avistamientos se numeran y dibujan en el mapa el recorrido de la mascota.
- **Alertas por zona**: cada usuario marca su barrio y un radio, y recibe una notificación cuando se publica un aviso dentro,
  también como **aviso push** en el móvil aunque no tenga Furrly abierta (la web es una PWA instalable).
- **Coincidencias automáticas**: si alguien encuentra un animal de la misma especie cerca de donde se perdió otro, y las fechas encajan,
  Furrly avisa a los dos dueños y lo enseña en la ficha («Puede que sea el mismo»).
- **Cartel para imprimir** en A4 con la foto y un **código QR** que abre el aviso (el teléfono solo sale si lo imprime el dueño).
- **Compartir por WhatsApp** con vista previa: foto, título y zona del aviso (los robots de vista previa reciben las etiquetas Open Graph desde la API).
- **Contacto y mensajes**: el autor puede dejar teléfono o email (solo visibles con sesión), y cualquiera puede escribirle por mensaje privado desde el aviso. Los mensajes llegan **en tiempo real**.

**Comunidad**
- Carnet de cada mascota, publicaciones con foto, likes, comentarios y seguir mascotas.
- Feed "Siguiendo" (las mascotas que sigues) y "Explorar" (todo lo reciente) con scroll infinito.
- Buscar perfiles por nombre o @usuario.
- Notificaciones de likes, comentarios, seguidores, avistamientos y avisos resueltos.

**Cuenta y moderación**
- **Guía de primeros pasos** para cuentas nuevas: marcar tu zona en el mapa, activar los avisos en el móvil y crear el carnet de tu mascota.
- Registro con email o **con Google** (la primera vez se elige el nombre de usuario), login y recuperación de contraseña.
  Perfil público y zona de alertas privada. Páginas legales: [aviso legal](https://furrly-rouge.vercel.app/aviso-legal), [privacidad](https://furrly-rouge.vercel.app/privacidad), [cookies](https://furrly-rouge.vercel.app/cookies) y [condiciones de uso](https://furrly-rouge.vercel.app/condiciones).
- Denunciar avisos, publicaciones, comentarios, usuarios o conversaciones, y un **panel de moderación** para revisarlas:
  descartar, borrar el contenido o suspender la cuenta del autor. Los moderadores reciben un push con cada denuncia y
  también pueden actuar sin esperar a una: borrar publicaciones, comentarios, avisos, avistamientos y mascotas donde se
  ven, y advertir, suspender (24 horas, 7 días, 30 días o indefinidamente) o borrar una cuenta desde su perfil. Cada decisión lleva un motivo, queda en un historial y se le explica
  al afectado. Cada cuenta tiene una ficha con su resumen y su historial, desde la que se puede limpiar el perfil o vaciar su contenido.
- **Bloquear** a un usuario: no podéis escribiros ni interactuar con vuestras publicaciones, y dejas de recibir sus avisos.
- Límites contra el spam: 30 mensajes por hora y 10 conversaciones nuevas al día por usuario.
- Borrar la cuenta con todos sus datos y fotos (derecho de supresión del RGPD).

## Arquitectura

```mermaid
flowchart LR
  subgraph Vercel["Vercel (un solo proyecto, región Frankfurt)"]
    web["Web estática<br/>React + Vite"]
    api["API REST<br/>Express 5 (función serverless en /api)"]
  end
  subgraph Supabase["Supabase"]
    auth["Auth<br/>(JWT)"]
    db[("PostgreSQL + PostGIS")]
    storage["Storage<br/>(fotos)"]
  end
  web -- "login / sesión" --> auth
  web -- "sube fotos a su carpeta" --> storage
  web -- "fetch + Bearer token" --> api
  api -- "valida el JWT con JWKS" --> auth
  api -- "Prisma + SQL (PostGIS)" --> db
```

- **La web y la API comparten dominio** (`/api`), así que no hay CORS. La API es la única que toca la base de datos:
  las tablas tienen RLS activado **sin políticas**, de modo que nadie puede leerlas directamente con la clave pública de Supabase.
- **Las fotos las sube el navegador** directamente a Storage, cada usuario solo en su carpeta (políticas del bucket).
  La API solo acepta URLs de esa carpeta.

## Decisiones técnicas que me gustaría destacar

- **Búsquedas geoespaciales con PostGIS.** `ST_DWithin` sobre columnas `geography` con índice GiST para "avisos en X km".
  Las alertas por zona usan el radio **de cada usuario**; antes se filtra por el radio máximo (50 km) para que Postgres pueda usar el índice.
- **Coincidencias perdido ↔ encontrado en una sola consulta.** Misma especie, `ST_DWithin` de 5 km y una ventana de fechas
  asimétrica (lo encontrado, de un día antes a 30 días después de la pérdida), sin avisos de la misma persona ni con bloqueos.
  No se guardan: se calculan al vuelo con el índice GiST, así que nunca quedan desfasadas al editar o resolver un aviso.
- **Reglas de negocio en la base de datos.** `CHECK` (un aviso de pérdida siempre tiene mascota, `resolved_at` solo si está resuelto),
  claves compuestas que hacen imposibles los likes o seguidores duplicados y una conversación única por pareja de usuarios
  (par ordenado con `CHECK user_a < user_b` + `UNIQUE`).
- **Operaciones idempotentes.** Like, seguir y denunciar son `PUT`/`DELETE` o `createMany({ skipDuplicates })`:
  repetir un clic no falla ni duplica nada, y solo notifica la primera vez.
- **Paginación por cursor** en el feed, las notificaciones y los mensajes, no por `offset`: no se repiten ni se saltan elementos aunque entren nuevos mientras haces scroll.
- **No leídos calculados, no almacenados.** Cada conversación guarda hasta cuándo ha leído cada lado; el número de no leídos sale de una consulta (`LATERAL` + subconsulta).
- **Privacidad por defecto.** El microchip solo se devuelve al dueño, la zona de alertas nunca es pública
  y el contacto de un aviso solo se ve con sesión (la API usa un middleware de **sesión opcional**).
- **Sin banner de cookies, y es legal.** Furrly no pone cookies: la sesión de Supabase va en el almacenamiento local y es estrictamente necesaria
  (exenta de consentimiento por el art. 22.2 de la LSSI), y Vercel Web Analytics cuenta visitas sin guardar nada en el dispositivo.
  La [política de cookies](https://furrly-rouge.vercel.app/cookies) lo explica, y al crear la cuenta se informa de las condiciones, la edad mínima (14 años) y la privacidad.
- **Tiempo real sin abrir la base de datos.** Las tablas tienen RLS sin políticas, así que no se puede usar el "escuchar cambios"
  de Supabase. En su lugar, la API **toca un timbre** por el canal privado de Supabase Realtime del destinatario (`user:<id>`) y la
  web vuelve a pedir los datos a la API. Por el canal no viaja contenido, y una política RLS en `realtime.messages` hace que cada
  usuario solo pueda escuchar el suyo. La consulta periódica queda como red de seguridad.
- **Web Push sin librerías.** El cifrado de extremo a extremo del RFC 8291 (ECDH P-256 + HKDF + AES-128-GCM) y la firma VAPID
  del RFC 8292 están implementados con `node:crypto` y `jose`, y se comprueban con el **vector de prueba oficial del RFC**.
  Solo se aceptan endpoints de servicios de push conocidos, para que nadie use la API para hacer peticiones a otros servidores (SSRF).
- **Seguridad comprobada, no solo prometida** ([SECURITY.md](SECURITY.md)): consultas siempre parametrizadas (la CI falla si aparece SQL sin parámetros),
  tests que lanzan inyección SQL, tokens falsificados y *mass assignment* contra la API, CSP estricta que los tests end-to-end
  respetan igual que producción, y CodeQL + Dependabot + `npm audit` en cada push.
- **Login con Google sin tocar el formulario.** Los botones solo aparecen para los proveedores activados en Supabase
  (la web lee sus ajustes públicos), así que activar Apple el día de mañana no requiere cambiar código. Como Google no da
  nombre de usuario, el trigger que crea el perfil genera uno provisional a partir del email y la web pide confirmarlo una sola vez.
- **Fotos ligeras y sin rastro.** Se comprimen en el navegador antes de subirlas (1600 px, WebP; de 3-5 MB a unos cientos de kB)
  y al redibujarlas se pierden los metadatos EXIF, incluida la ubicación GPS. Un cron nocturno de Vercel borra de Storage las
  fotos que ya no usa nadie (avisos borrados, formularios abandonados).
- **UI optimista** en los likes: el corazón cambia al instante y se corrige con la respuesta de la API, o se deshace si falla.
- **Asistente de 3 pasos con un solo `<form>`.** Los pasos ocultos siguen montados, así `FormData` lo lee todo al final y volver atrás no pierde nada.
  Cada paso se valida con `reportValidity()`.
- **Diseño propio** hecho con Claude Design ([docs/diseno.md](docs/diseno.md)): tokens en Tailwind v4 (`@theme`), componentes base sin librería de UI,
  móvil primero con barra lateral en escritorio, e iconos SVG propios.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, TypeScript 7, Tailwind CSS v4, React Router 8 |
| Mapas | Leaflet + OpenStreetMap, geocodificación con Nominatim |
| API | Node, Express 5, TypeScript, zod |
| Base de datos | PostgreSQL + PostGIS (Supabase), Prisma 7 con driver adapter `pg` |
| Autenticación | Supabase Auth: la API valida el JWT con el JWKS del proyecto (`jose`) |
| Imágenes | Supabase Storage |
| Tests y CI | Vitest + Supertest (API, PostGIS real), Vitest + Testing Library (web), Playwright (end-to-end), GitHub Actions |
| Despliegue | Vercel (web estática + API serverless) |

## Estructura

```
apps/
  web/                     → frontend (React)
    src/components/ui/     → componentes base del diseño (Button, Chip, Sheet, BottomNav, Sidebar...)
    public/demo/           → fotos de la demo (dominio público / CC0, ver CREDITS.md)
  api/                     → API REST (Express + Prisma)
    src/routes/            → un router por recurso (reports, posts, conversations...)
    src/scripts/           → script de datos de demo
    prisma/schema.prisma   → modelo de datos
    prisma/migrations/     → migraciones SQL (incluye PostGIS, CHECKs, triggers y RLS)
    test/                  → tests de integración
  web/e2e/                 → tests end-to-end (Playwright)
docs/                      → modelo de datos, diseño y capturas
```

## Tests

Todo se ejecuta en GitHub Actions en cada push ([ver workflow](.github/workflows/ci.yml)):

- **API: 131 tests de integración** (Vitest + Supertest) contra un PostgreSQL + PostGIS real, como servicio del workflow:
  reglas de negocio, permisos ("no puedes leer conversaciones ajenas"), búsquedas geoespaciales, alertas por zona,
  paginación, Web Push (incluido el vector del RFC 8291), bloqueos y límites anti-spam, ataques (inyección SQL, tokens falsos), el trigger que crea el perfil al entrar con Google y casos límite. Los tokens se firman con una clave ES256
  generada en cada ejecución, igual que hace Supabase Auth.
- **Web: 60 tests de componentes** (Vitest + Testing Library + jsdom) de la lógica más delicada: el asistente de publicar
  (validación por pasos, título propuesto, lo que se envía a la API), el like optimista y su deshacer, mensajes, push, denuncias, bloqueos, moderación, redirecciones seguras, la recarga tras un despliegue y el registro (nombre de usuario que se corrige al escribir, errores en español y el aviso de condiciones y privacidad).
- **End-to-end: 36 tests con Playwright** (cada uno en móvil y escritorio) en un Chromium real, sobre la web compilada y con la API
  simulada (nunca tocan datos reales) y con la misma CSP que producción: un invitado explora el mapa, publicar un aviso con clic real en el mapa, escribir un mensaje, una conversación bloqueada, entrar con Google (botón, vuelta y elegir nombre de usuario), moderar sin denuncia y qué pasa si falta un archivo de la web tras un despliegue.

## Calidad

Notas de **Lighthouse** en producción (móvil / escritorio), medidas cada semana por un
[workflow de GitHub Actions](.github/workflows/lighthouse.yml):

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Mapa de avisos | 80-88 / 94-98 | 100 / 100 | 96 / 100 | 100 / 100 |
| Comunidad | 94 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |
| Entrar | 97 / 100 | 100 / 100 | 100 / 100 | 100 / 100 |

- **Accesibilidad comprobada en cada push:** los tests end-to-end pasan **axe** (WCAG 2.1 AA) por las pantallas principales
  en móvil y escritorio, y fallan si la CSP bloquea cualquier cosa.
- **El mapa en móvil pasó de 72 a 80-88** (LCP de 4,9 a 3,7-5,1 s según el día). Lighthouse simula un 4G lento, así que lo que cuenta son los kB que se
  descargan antes de pintar la primera tesela: cada página se carga bajo demanda (el JS inicial ya no lleva mensajes, moderación…),
  Nunito Sans solo con el eje de grosor (50 → 31 kB) y Sentry (~150 kB) solo se descarga si ocurre un error.
  Lo que queda son sobre todo las ~500 kB de teselas de OpenStreetMap, que no dependen de la web.
- Cada página se mide **3 veces y se toma la mediana**: en las máquinas de GitHub una sola medición del mismo código variaba de 56 a 75,
  y aun así la mediana cambia de un día a otro (88 el domingo y 80 el lunes, con los mismos 766 kB descargados). Por eso el mapa lleva un rango.
- Fuentes servidas desde el propio dominio, estáticos con caché de un año (nombres con hash) y fotos comprimidas.

## Puesta en marcha

Requisitos: Node 22+ y un proyecto de Supabase.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # rellenar con los datos de Supabase
cp apps/web/.env.example apps/web/.env
npm run db:deploy -w @furrly/api         # aplica las migraciones
npm run db:seed-demo -w @furrly/api -- --yes   # opcional: datos de demo
npm run dev:api
npm run dev:web
```

## Despliegue

Un único proyecto de **Vercel** ([vercel.json](vercel.json)): la web se sirve como estáticos y la API de Express como
función serverless en `/api` ([api/index.mjs](api/index.mjs)), en Frankfurt, junto a Supabase.
Cada push a `main` despliega y aplica las migraciones pendientes (`prisma migrate deploy`).

## Documentación

- [Modelo de datos](docs/modelo-datos.md)
- [Diseño visual](docs/diseno.md)
- [Seguridad](SECURITY.md)
- [Contexto, decisiones y hoja de ruta](furrly.md)
- [Créditos de las fotos de la demo](apps/web/public/demo/CREDITS.md)
