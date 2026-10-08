# Scriptorium

Gestor de biblioteca personal: API Express + SQLite (`api/`) y frontend Angular (`web/`).

- Spec: [docs/superpowers/specs/2026-10-07-scriptorium-core-design.md](docs/superpowers/specs/2026-10-07-scriptorium-core-design.md)
- Plan: [docs/superpowers/plans/2026-10-07-scriptorium-core.md](docs/superpowers/plans/2026-10-07-scriptorium-core.md)

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

Estados: `to-read` (default) | `reading` | `read` | `borrowed` | `not-interested`.

## Estructura

```
api/
├── openapi.yaml        contrato (fuente de verdad)
└── src/
    ├── db.ts           abre SQLite (archivo o :memory:) y crea la tabla
    ├── books.repo.ts   SQL puro: list / get / create / update / remove
    ├── books.schema.ts zod: body de POST/PATCH y query de GET
    ├── books.routes.ts HTTP -> repo; reglas de negocio; mapeo a errores
    ├── app.ts          crea la app Express recibiendo la db (sin listen)
    └── server.ts       entrypoint: abre la db en disco y hace listen
web/src/app/
├── books.api.ts        único punto que hace HTTP contra /api
├── book-list/          lista + filtros (estado, texto, orden)
├── book-card/          card: estado, progreso, editar, borrar
├── book-form/          alta/edición en el modal; errores 422 por campo
├── progress-bar/       presentacional: %, páginas, +/-
├── status-selector/
└── modal-overlay/
```

## Reglas

- El contrato es `api/openapi.yaml` y se actualiza **antes** de cambiar una ruta.
- Las reglas de negocio viven solo en `books.routes.ts`.
- En el front solo `books.api.ts` hace HTTP.
- TDD: cada test se ve fallar antes de escribir el código.
- Commits `TP final: ...`, sin Co-Authored-By.
- Variables de entorno de la API: `PORT` (default `3000`), `DB_PATH` (default `data/scriptorium.db`).

## Comandos

- `api/`: `npm test` y `npm run dev`.
- `web/`: `npx ng test --watch=false` y `npx ng serve` (o `npm start`).
