# Trabajo Práctico Final — Título

La aplicación completa: interfaz, servidor y datos que persisten. Se presenta y se defiende en la última clase.

Además de lo que pide cada entrega anterior, acá se espera que el repositorio conserve la evidencia del proceso: la especificación y el plan como archivos en disco, el historial de commits, las branches y los pull requests. Para cuando llegues a esta entrega vas a tener las herramientas para que eso salga solo, como subproducto de trabajar bien.

## Cómo se ejecuta

Requisitos: Node.js 22.22+ o 24.15+ (lo exige Angular 22) y npm.

Dependencias, una sola vez (desde `tp-final/`):

```bash
(cd api && npm install)
(cd web && npm install)
```

Después, dos terminales, cada una empezando en `tp-final/`:

```bash
# Terminal 1: API (puerto 3000)
cd api && npm run dev
```

```bash
# Terminal 2: frontend (puerto 4200)
cd web && npx ng serve
```

Después abrí http://localhost:4200. El servidor de desarrollo de Angular redirige `/api` a `http://localhost:3000`.

Variables de entorno de la API: `PORT` (default `3000`) y `DB_PATH` (default `data/scriptorium.db`; el archivo SQLite se crea solo). Tests: `npm test` en `api/` y `npx ng test --watch=false` en `web/`.

## Arquitectura

- **API** (`api/`): Express + SQLite (`better-sqlite3`) con validación `zod`. Expone `GET/POST /api/books` y `GET/PATCH/DELETE /api/books/:id`. Filtros por `status` y `q`, y orden con `sort` (`newest`, `oldest`, `title`, `author`), todo en el servidor.
- **Datos**: una tabla `books` (título, autor, ISBN, páginas, descripción, estado, `pagesRead`, fechas). Las reglas de negocio (estados y progreso) viven en `books.routes.ts`.
- **Frontend** (`web/`): Angular con componentes standalone y signals. Solo `books.api.ts` hace HTTP; `book-list` guarda la lista en un signal y actualiza en el lugar con las respuestas del servidor.
- **Contrato**: [api/openapi.yaml](api/openapi.yaml) es la fuente de verdad entre interfaz y servidor. El diseño completo está en el [spec](docs/superpowers/specs/2026-10-07-scriptorium-core-design.md).
- **Limitación conocida**: la búsqueda y el orden por título/autor ignoran mayúsculas solo para ASCII, así que "Ángel" y "angel" no se consideran iguales.

## Qué decidí yo

Las decisiones de arquitectura que tomaste vos. Es lo que vas a defender en el Demo Day.

## Cómo gestioné el contexto

Un proyecto de varios archivos y varias sesiones no entra entero en la ventana de contexto. Cómo lo resolviste: qué persististe, qué aislaste, cómo hiciste para que el agente no perdiera el hilo entre sesiones.

## Qué salió mal

Los desvíos grandes: dónde el agente se fue para otro lado, cómo lo detectaste y cómo lo corregiste.
