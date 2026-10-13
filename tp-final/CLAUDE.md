# Scriptorium

Gestor de biblioteca personal: API Express + SQLite (`api/`) y frontend Angular (`web/`).

- Spec: [docs/superpowers/specs/2026-10-07-scriptorium-core-design.md](docs/superpowers/specs/2026-10-07-scriptorium-core-design.md)
- Plan: [docs/superpowers/plans/2026-10-07-scriptorium-core.md](docs/superpowers/plans/2026-10-07-scriptorium-core.md)
- Spec de la búsqueda en Google Books: [docs/superpowers/specs/2026-10-12-google-books-lookup-design.md](docs/superpowers/specs/2026-10-12-google-books-lookup-design.md)
- Plan de la búsqueda en Google Books: [docs/superpowers/plans/2026-10-12-google-books-lookup.md](docs/superpowers/plans/2026-10-12-google-books-lookup.md)
- Spec de portadas: [docs/superpowers/specs/2026-10-13-portadas-design.md](docs/superpowers/specs/2026-10-13-portadas-design.md)
- Plan de portadas: [docs/superpowers/plans/2026-10-13-portadas.md](docs/superpowers/plans/2026-10-13-portadas.md)

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
    ├── app.ts          crea la app Express recibiendo la db y el buscador (sin listen)
    └── server.ts       entrypoint: abre la db en disco y hace listen
web/src/app/
├── books.api.ts        HTTP de libros contra /api/books
├── lookup.api.ts       HTTP de la búsqueda contra /api/lookup
├── book-list/          lista + filtros (estado, texto, orden)
├── book-card/          card: estado, progreso, editar, borrar
├── book-lookup/        buscador en Google Books dentro del modal de alta
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
- Variables de entorno de la API: `PORT` (default `3000`), `DB_PATH` (default `data/scriptorium.db`), `GOOGLE_BOOKS_API_KEY` (opcional).

## Comandos

- `api/`: `npm test` y `npm run dev`.
- `web/`: `npx ng test --watch=false` y `npx ng serve` (o `npm start`).
