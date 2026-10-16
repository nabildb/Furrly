# Diseño visual — Furrly

Hecho con Claude Design, lienzo: https://claude.ai/artifact/DYomxy2skJifWzksmE18iR (privado del dueño).
Hay tres propuestas (A, B y C). **La elegida es la C**. Sus pantallas están copiadas en [docs/diseno/](diseno/)
(`C_*.dc.html`: HTML con estilos en línea; sirven de referencia exacta de medidas, colores y estructura).

> Estado: **aplicada** en `apps/web` (16-10-2026). Ver "Cómo se ha aplicado" al final.

## Propuesta C = colores de la A + tipografía de la B

### Tipografía (Google Fonts)
- **Unbounded** 600/800 — títulos, logotipo y botones principales (letter-spacing negativo, −0,5 a −2 px).
- **Nunito Sans** 400/600/700/800 — texto e interfaz.

### Colores
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#1B2430` | texto, botones neutros, navegación, carnet |
| `bg` | `#FBFAF7` | fondo de la app |
| `surface` | `#FFFFFF` | tarjetas (borde `#EEECE6`) |
| `lost` | `#C2410C` | marca, avisos perdidos, CTA "Publicar" |
| `lost-soft` / `lost-text` | `#FDE8DC` / `#9A3412` | etiqueta "Perdida" |
| `found` | `#1E5BB8` | avisos encontrados |
| `found-soft` / `found-text` | `#DCE8FA` / `#1E4A8F` | etiqueta "Encontrada" |
| `sighting` | `#F59E0B` | avistamientos, botón "La he visto" (texto `ink`) |
| `muted` | `#5B6472` | texto secundario (contraste 5,9:1) |
| `resolved-soft` / `resolved-text` | `#E7F0E3` / `#2F6B2A` | "Resuelto" |
| `line` | `#E4E2DC` | bordes de inputs y botones secundarios |
| mapa | `#ECEFE7` fondo, `#CFE3C4` parques | solo mockup; en la web es Leaflet |

Naranja (perdida) frente a azul (encontrada): se distinguen también con daltonismo (no rojo/verde).

### Forma
- Radios: tarjetas 18–22 px, botones grandes 18 px, chips 18–19 px (pastilla), iconos de marca 12–14 px.
- Botones principales 56–60 px de alto; objetivos táctiles ≥ 44 px.
- Iconos: SVG de trazo (stroke 2–2,4), nunca emoji. Logo: huella blanca en cuadrado redondeado naranja.

## Pantallas (móvil primero, 390 px)
1. **Avisos cerca** (`C_Avisos`) — estructura B: mapa a pantalla completa; arriba buscador flotante (logo + "Buscando cerca de" + notificaciones) y chips de filtro; marcadores en forma de pastilla con foto y nombre (naranja/azul); carrusel horizontal de tarjetas flotantes abajo; barra de navegación flotante oscura (Mapa activo en pastilla blanca, + Publicar naranja, Mascotas, Perfil).
2. **Ficha de aviso** (`C_Aviso`) — estructura A: foto grande arriba con volver/compartir, hoja con etiqueta PERDIDA, título, datos (dónde/cuándo), "Su recorrido" con mapa de avistamientos numerados y línea discontinua, lista de avistamientos; barra fija abajo: contactar + "La he visto" (ámbar).
3. **Publicar aviso** (`C_Publicar`) — estructura B: asistente de 3 pasos con barra de progreso naranja. Paso 1 "¿Qué ha pasado?" con dos tarjetas de elección grandes (perdida/encontrada) y selección de mascota; botón "Siguiente" oscuro. Pasos 2 (dónde y cuándo: mapa + fecha) y 3 (descripción + fotos) por diseñar siguiendo el mismo estilo.
4. **Carnet de mascota** (`C_Mascota`) — estructura B: selector de mascotas en chips, tarjeta "CARNET FURRLY" oscura con círculo naranja decorativo, foto, nombre, datos y aviso de microchip privado; bloque "Cómo es"; botón contorno naranja "Avisar de que se ha perdido".
5. **Identidad** (`C_Marca`) — logo, paleta y componentes (botones, etiquetas, tarjeta de elección, carnet).

## Cómo aplicarlo en `apps/web`
- Tailwind v4: definir los tokens en `src/index.css` con `@theme` (colores, `--font-display: 'Unbounded'`, `--font-sans: 'Nunito Sans'`) y cargar las fuentes en `index.html`.
- Crear componentes base: `Button` (primary/sighting/dark/outline), `Badge` (lost/found/resolved/cancelled), `Chip`, `Card`, `BottomNav` flotante, `TopSearchBar`.
- Rehacer páginas por orden: Layout + navegación → Avisos cerca → Ficha → Publicar (convertir en asistente de 3 pasos) → Mascotas/carnet → resto (login, registro, perfil, mis avisos, 404) con los mismos tokens.
- En escritorio: contenido centrado con ancho máximo; en el mapa, lista lateral en vez de carrusel.

## Cómo se ha aplicado
- **Tokens**: `apps/web/src/index.css` (`@theme`). Leaflet pinta con colores en JS, así que `src/lib/reports.ts` repite los hex del mapa.
- **Componentes base**: `src/components/ui/` (Button, Badge, Chip, Card, ChoiceCard, Sheet, BottomNav, TopSearchBar, Logo e iconos SVG propios, sin librería). Clases compartidas en `ui/styles.ts`. En desarrollo hay una guía en `/guia`.
- **Navegación**: la portada es el mapa (`/` → `/avisos`). La barra flotante se oculta en pantallas con su propia barra de acciones (ficha, publicar, formularios).
- **Mapa**: teselas de OpenStreetMap con un filtro CSS que baja la saturación (las de CARTO ya piden API key). Marcadores `L.divIcon` en pastilla, con el texto escapado contra XSS. Buscador de zonas con Nominatim (solo al enviar, como pide su política). Carrusel en móvil y lista lateral en escritorio (`useMediaQuery`, para montar solo una).
- **Ficha**: el botón de "contactar" lleva al perfil de quien publica (aún no hay mensajería). "La he visto" abre una hoja modal con el mapa centrado en el último punto conocido.
- **Publicar**: un solo `<form>` con un `<fieldset>` por paso; los ocultos siguen montados para que `FormData` lo lea todo y volver atrás no pierda nada. Cada paso se valida con `reportValidity()`. Las mascotas con un aviso de pérdida activo no se pueden elegir.
- **Carnet**: `/mascotas` (con `?m=<id>`) y `/mascotas/:id`. Si la mascota ya tiene un aviso activo, el botón lleva a ese aviso en vez de crear otro.
- **Cambios en la API**: `GET /reports` devuelve `petName` (rótulo de los marcadores) y `GET /me/reports` devuelve `petId`. Los dos tienen test.
- **Responsive** (16-10-2026): hasta 768 px se usa el diseño de móvil; en tablet (≥ 768 px) el contenido se ensancha, el buscador del mapa se queda en una columna y los chips caben en varias líneas; en escritorio (≥ 1024 px) la barra flotante pasa a una **barra lateral fija** (`Sidebar`, ancho en `--sidebar-w`), el mapa muestra una lista lateral y la ficha, el carnet, el perfil, editar aviso y el acceso van a dos columnas. Las secciones de navegación están en `ui/navItems.tsx`, así que para añadir el feed solo hay que sumar una entrada.
