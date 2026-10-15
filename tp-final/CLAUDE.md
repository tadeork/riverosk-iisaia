# Scriptorium

Gestor de biblioteca personal: API Express + SQLite (`api/`) y frontend Angular (`web/`).

- Spec: [docs/superpowers/specs/2026-10-07-scriptorium-core-design.md](docs/superpowers/specs/2026-10-07-scriptorium-core-design.md)
- Plan: [docs/superpowers/plans/2026-10-07-scriptorium-core.md](docs/superpowers/plans/2026-10-07-scriptorium-core.md)
- Spec de la búsqueda en Google Books: [docs/superpowers/specs/2026-10-12-google-books-lookup-design.md](docs/superpowers/specs/2026-10-12-google-books-lookup-design.md)
- Plan de la búsqueda en Google Books: [docs/superpowers/plans/2026-10-12-google-books-lookup.md](docs/superpowers/plans/2026-10-12-google-books-lookup.md)
- Spec de portadas: [docs/superpowers/specs/2026-10-13-portadas-design.md](docs/superpowers/specs/2026-10-13-portadas-design.md)
- Plan de portadas: [docs/superpowers/plans/2026-10-13-portadas.md](docs/superpowers/plans/2026-10-13-portadas.md)
- Spec del escaneo de la tapa: [docs/superpowers/specs/2026-10-14-escaneo-tapa-design.md](docs/superpowers/specs/2026-10-14-escaneo-tapa-design.md)
- Plan del escaneo de la tapa: [docs/superpowers/plans/2026-10-14-escaneo-tapa.md](docs/superpowers/plans/2026-10-14-escaneo-tapa.md)
- Spec del deploy en Render: [docs/superpowers/specs/2026-10-14-deploy-render-design.md](docs/superpowers/specs/2026-10-14-deploy-render-design.md)
- Plan del deploy en Render: [docs/superpowers/plans/2026-10-14-deploy-render.md](docs/superpowers/plans/2026-10-14-deploy-render.md)

## Decisiones

| Tema | Decisión |
|---|---|
| Persistencia | API propia + SQLite (archivo) |
| Alcance | CRUD + 5 estados + progreso + lista con filtros/orden + diseño base |
| Frontend | Angular (standalone components, signals) |
| Usuarios | Uno solo, sin login |
| Progreso | Se guarda `pagesRead` (entero); el porcentaje se calcula en el cliente |
| Backend | Express + `better-sqlite3` + `zod`, contrato OpenAPI primero |
| Filtrado/orden | En el servidor (query params `status`, `q`, `sort`) |
| Actualización | `PATCH` parcial |
| Portadas | Solo la URL (`coverUrl`); Google o a mano; placeholder si falla |
| Deploy | Render gratis, un servicio: Express sirve `/api` y el build de Angular (`WEB_DIR`); SQLite efímero |
| Escaneo de la tapa | OCR en vivo en el navegador (Tesseract.js, `spa`), 1 lectura/s; el texto va a la consulta del buscador |

Estados: `to-read` (default) | `reading` | `read` | `borrowed` | `not-interested`.

## Estructura

```
api/
├── openapi.yaml        contrato (fuente de verdad)
└── src/
    ├── db.ts           abre SQLite (archivo o :memory:), crea la tabla y migra columnas nuevas
    ├── books.repo.ts   SQL puro: list / get / create / update / remove
    ├── books.schema.ts zod: body de POST/PATCH y query de GET
    ├── books.routes.ts HTTP -> repo; reglas de negocio; mapeo a errores
    ├── lookup/         búsqueda en Google Books: adaptador y ruta GET /api/lookup
    ├── app.ts          crea la app Express recibiendo la db, el buscador y, opcional, la carpeta del front (sin listen)
    └── server.ts       entrypoint: abre la db en disco y hace listen
web/src/app/
├── books.api.ts        HTTP de libros contra /api/books
├── lookup.api.ts       HTTP de la búsqueda contra /api/lookup
├── camera.ts           getUserMedia (único que toca la cámara)
├── cover-ocr.ts        recorte del recuadro guía + Tesseract (import dinámico)
├── cover-scanner/      video con recuadro guía; emite el texto leído cada 1 s
├── book-list/          lista + filtros (estado, texto, orden)
├── book-card/          card: estado, progreso, editar, borrar
├── book-lookup/        buscador en Google Books y botón Escanear tapa, en el modal de alta
├── book-form/          alta/edición en el modal; errores 422 por campo
├── progress-bar/       presentacional: %, páginas, +/-
├── status-selector/
└── modal-overlay/
```

## Reglas

- El contrato es `api/openapi.yaml` y se actualiza **antes** de cambiar una ruta.
- Las reglas de negocio viven solo en `books.routes.ts`.
- En el front solo los archivos `*.api.ts` hacen HTTP.
- TDD: cada test se ve fallar antes de escribir el código.
- Commits `TP final: ...`, sin Co-Authored-By.
- Variables de entorno de la API: `PORT` (default `3000`), `DB_PATH` (default `data/scriptorium.db`), `GOOGLE_BOOKS_API_KEY` (opcional), `WEB_DIR` (opcional: carpeta del build de Angular que la API sirve, con fallback a `index.html` para lo que no es `/api`).

## Comandos

- `api/`: `npm test`, `npx tsc --noEmit` (chequeo de tipos, no genera archivos) y `npm run dev`.
- `web/`: `npx ng test --watch=false`, `npx ng build` y `npx ng serve` (o `npm start`).
- Contrato, desde `api/`: `npx @redocly/cli@latest lint openapi.yaml`. Necesita red; hoy da válido con 1 warning.
- Dependencias: `npm install` en `api/` y en `web/`. Cambiar dependencias se confirma con el usuario antes.

## Verificación antes de terminar

- Cambios en `api/`: `npm test` y `npx tsc --noEmit`. Si se tocó `openapi.yaml`, también el lint del contrato.
- Cambios en `web/`: `npx ng test --watch=false` y `npx ng build`.
- El hook Stop de `.claude/` corre estas verificaciones solo si hay cambios sin commitear. Antes de commitear o abrir un PR hay que correrlas igual, y citar la salida.
- Prettier: `web/.prettierrc` existe, pero hay archivos que no lo cumplen. No se corre sobre carpetas enteras, porque mete diffs ajenos a la tarea.

## Datos

- `api/data/scriptorium.db` es la base real del usuario: está fuera de git y no se borra, no se mueve ni se migra a mano. Si un cambio de esquema la toca, se hace un backup antes y se avisa.
- Los tests usan SQLite `:memory:` o archivos en el directorio temporal del sistema, y un `fetch` falso. Ninguno toca la base real ni la red.
