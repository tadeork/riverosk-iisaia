# Scriptorium — Núcleo (diseño)

Fecha: 2026-10-07
Estado: aprobado en brainstorming, pendiente de revisión del spec escrito

## Objetivo

Reconstruir desde cero el núcleo de Scriptorium, un gestor de biblioteca personal, como aplicación con frontend y backend con persistencia del lado del servidor. El original (`scriptorium-projects/scriptorium`, Angular + localStorage) es solo una guía: no se copia código.

Este spec cubre el primer ciclo. Las demás features tienen cada una su propio ciclo de spec → plan → branch → PR (ver "Fuera de alcance").

### Criterios de éxito

- Se puede crear, listar, filtrar, ordenar, editar y borrar libros, y los datos sobreviven a un reinicio del servidor.
- Las reglas de negocio (estados, progreso) las aplica el servidor y están cubiertas por tests.
- El contrato `api/openapi.yaml` existe antes que el código del servidor y coincide con lo implementado.
- Cada decisión de este documento se puede explicar en el Demo Day.

## Decisiones

| Tema | Decisión | Alternativas descartadas |
|---|---|---|
| Persistencia | API propia + SQLite (archivo) | Firebase (Functions + Firestore), Postgres |
| Alcance del núcleo | CRUD + 5 estados + progreso + lista con filtros/orden + diseño base | Núcleo + búsqueda externa; solo CRUD |
| Frontend | Angular (standalone components, signals) | React + Vite; HTML + JS vanilla |
| Usuarios | Un solo usuario, sin login | Multiusuario con login; multiusuario sin auth |
| Progreso | Se guarda `pagesRead` (entero); el porcentaje se calcula en el cliente | `readProgress` 0-100 como el original; ambos campos |
| Backend | Express + `better-sqlite3` + `zod`, contrato OpenAPI primero | Fastify + `node:sqlite`; NestJS + TypeORM |
| Filtrado/orden | En el servidor (query params) | En el cliente |
| Actualización | `PATCH` parcial | `PUT` completo; endpoint `/progress` aparte |

## Modelo de datos

Tabla `books` (SQLite):

| campo | tipo | regla |
|---|---|---|
| `id` | TEXT (UUID) | lo genera el servidor |
| `title` | TEXT | requerido, no vacío |
| `author` | TEXT | requerido, no vacío |
| `isbn` | TEXT | opcional |
| `pages` | INTEGER | opcional, > 0 |
| `description` | TEXT | opcional |
| `status` | TEXT | `to-read` \| `reading` \| `read` \| `borrowed` \| `not-interested`; default `to-read` |
| `pagesRead` | INTEGER | 0 ≤ `pagesRead` ≤ `pages`; default 0 |
| `createdAt` | TEXT (ISO 8601) | lo pone el servidor al crear |
| `updatedAt` | TEXT (ISO 8601) | lo pone el servidor en cada escritura |

### Reglas de negocio (servidor)

1. Si `status` queda en `read` (al crear o al actualizar), el servidor fija `pagesRead = pages`.
2. Si `pages` no está definido, `pagesRead` debe ser 0. Mandar otro valor devuelve 422.
3. `pagesRead > pages` o `pagesRead < 0` devuelve 422. El servidor no recorta el valor en silencio.
4. Si un `PATCH` cambia `pages` a un valor menor que el `pagesRead` actual sin mandar un `pagesRead` nuevo, devuelve 422.
5. Los campos que maneja el servidor (`id`, `createdAt`, `updatedAt`) se ignoran si vienen en el body.

## Contrato de la API

Base: `/api`. JSON en request y response. La fuente de verdad es `api/openapi.yaml`, que se escribe antes que el código.

| método | ruta | éxito | errores |
|---|---|---|---|
| GET | `/books?status=&q=&sort=` | 200 `Book[]` | 400 filtro inválido |
| GET | `/books/:id` | 200 `Book` | 404 |
| POST | `/books` | 201 `Book` + header `Location: /api/books/:id` | 422 |
| PATCH | `/books/:id` | 200 `Book` | 404, 422 |
| DELETE | `/books/:id` | 204 sin body | 404 |

Query params de `GET /books`, todos opcionales:

- `status`: uno de los 5 estados.
- `q`: texto. Busca sin distinguir mayúsculas en `title`, `author` e `isbn`.
- `sort`: `newest` (default, `createdAt` descendente) \| `oldest` \| `title` (A-Z) \| `author` (A-Z).

`PATCH` acepta cualquier subconjunto de los campos editables (`title`, `author`, `isbn`, `pages`, `description`, `status`, `pagesRead`). Un body vacío devuelve 422.

Forma uniforme de error:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "pagesRead": "must be ≤ pages" } } }
```

`code` ∈ `BAD_REQUEST` (400), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `INTERNAL` (500). `fields` solo aparece en 422.

## Estructura

```
tp-final/
├── CLAUDE.md               decisiones de arquitectura + convenciones (desde el primer commit)
├── README.md               el informe
├── docs/superpowers/specs/ este spec
├── docs/superpowers/plans/ el plan
├── api/
│   ├── openapi.yaml        contrato
│   └── src/
│       ├── db.ts           abre SQLite (ruta de archivo o :memory:) y crea la tabla
│       ├── books.repo.ts   SQL puro: list / get / create / update / remove
│       ├── books.schema.ts zod: body de POST/PATCH y query de GET
│       ├── books.routes.ts HTTP → repo; reglas de negocio; mapeo a errores
│       ├── app.ts          crea la app Express recibiendo la db (sin listen)
│       └── server.ts       entrypoint: abre la db en disco y hace listen
└── web/                    Angular standalone + signals
    └── src/app/
        ├── books.api.ts    único punto que hace HTTP contra /api
        ├── book-list/      lista + filtros (estado, texto, orden) → query params
        ├── book-card/      card: estado, progreso, editar, borrar (con confirmación)
        ├── book-form/      alta/edición dentro del modal; muestra errores 422 por campo
        ├── progress-bar/   presentacional: %, "X / Y páginas", +/-; deshabilitado si read
        ├── status-selector/
        └── modal-overlay/
```

Responsabilidades: el repo solo hace SQL, las rutas solo hacen HTTP, las reglas viven en un único lugar del backend y en el front solo `books.api.ts` conoce las URLs. En desarrollo, `ng serve` pasa `/api` a Express con `proxy.conf.json`, así que no hace falta CORS.

## Flujo de datos

- El servidor es la única fuente de verdad. No hay localStorage.
- `book-list` guarda la lista en un signal. Cambiar un filtro vuelve a pedir `GET /books` con los query params.
- Alta, edición y baja llaman al endpoint y actualizan el signal en el lugar con la respuesta (o sacan el elemento), sin pedir toda la lista otra vez.
- Progreso (+/-): manda `PATCH { pagesRead: actual ± 1 }` y muestra el `Book` que devuelve el servidor. No se actualiza antes de la respuesta: si falla, el valor queda como estaba y aparece el error.
- La barra de progreso solo se muestra en `reading` y `read`, y solo si hay `pages`. En `read` muestra 100% y "Y / Y páginas" con los botones deshabilitados.

## Manejo de errores

- Backend: un middleware de errores traduce los errores de zod a 422 con `fields`, el "no encontrado" a 404 y cualquier excepción no controlada a 500 genérico (se registra en el log; no se expone el stack).
- Frontend:
  - 422 → mensajes por campo en `book-form`.
  - 404 / 400 / 500 → mensaje en la parte de arriba de la vista.
  - Error de red (servidor caído) → aviso "sin conexión con el servidor".

## Diseño visual (base)

Neobrutalismo tomado del original: paleta verde (#2d5016, #558b2f, #7cb342) con acento amarillo (#fbc02d), Courier New, bordes sólidos de 2-4px, sombras desplazadas (6px 6px 0). Mobile-first: 1 columna en móvil y grid `auto-fill, minmax(280px, 1fr)` desde 768px. Los colores del borde de cada card dependen del estado.

## Testing

TDD: cada test se ve fallar antes de escribir el código que lo hace pasar.

- **API (prioridad):** Vitest + supertest contra SQLite `:memory:`, con una app nueva por test.
  - Caso feliz de cada endpoint y status code.
  - Errores: 400 (filtro inválido), 404, 422 (campos requeridos, `pages` ≤ 0, `pagesRead` fuera de rango, body vacío en PATCH).
  - Reglas 1-5 de "Reglas de negocio".
  - Filtros `status` y `q`, y los 4 órdenes.
  - Persistencia: datos escritos en una db de archivo siguen ahí al reabrirla.
- **Web:**
  - `books.api.ts` con `HttpTestingController` (URLs, métodos, query params).
  - `progress-bar`: porcentaje, deshabilitado en `read`, emite +/-.
  - `book-form`: validación de requeridos y errores 422 mostrados por campo.

## Fuera de alcance (ciclos siguientes)

Wishlist, búsqueda en Google Books/OpenLibrary (vía proxy del backend), categorías/colecciones, importar/exportar CSV, PWA, tests E2E, autenticación/multiusuario.
