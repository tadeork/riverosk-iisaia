# Trabajo Práctico Final — Scriptorium

Un gestor de biblioteca personal: cargás tus libros, les ponés un estado (por leer, leyendo, leído, prestado, no me interesa), registrás por qué página vas y filtrás u ordenás la lista. Al dar de alta un libro podés buscarlo en Google Books para no tipear los datos, y cada libro puede tener portada. Los datos viven en el servidor, en SQLite, y sobreviven a un reinicio.

Es la reconstrucción desde cero de una app que ya tenía (Angular + localStorage, sin backend propio). La usé solo como guía de qué hacía, no como código para copiar: la idea era que esta versión saliera del proceso del curso y no de pegar lo que ya existía.

## Cómo se lee la evidencia

Cada feature fue un ciclo propio de spec → plan → branch → implementación con TDD → revisión → merge:

| Ciclo | Spec | Plan |
|---|---|---|
| Núcleo (CRUD, estados, progreso, filtros) | [spec](docs/superpowers/specs/2026-10-07-scriptorium-core-design.md) | [plan](docs/superpowers/plans/2026-10-07-scriptorium-core.md) |
| Búsqueda en Google Books | [spec](docs/superpowers/specs/2026-10-12-google-books-lookup-design.md) | [plan](docs/superpowers/plans/2026-10-12-google-books-lookup.md) |
| Portadas | [spec](docs/superpowers/specs/2026-10-13-portadas-design.md) | [plan](docs/superpowers/plans/2026-10-13-portadas.md) |

- El contrato entre interfaz y servidor es [api/openapi.yaml](api/openapi.yaml).
- Las decisiones de arquitectura y las reglas para el agente están en [CLAUDE.md](CLAUDE.md), desde el primer commit.
- Los prompts de todas las sesiones, en orden, están en [prompts.md](prompts.md).
- El núcleo entró por el [PR #1](https://github.com/tadeork/riverosk-iisaia/pull/1). Las otras dos features se mergearon en local (ver "Qué salió mal").

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

Variables de entorno de la API: `PORT` (default `3000`) y `DB_PATH` (default `data/scriptorium.db`; el archivo SQLite se crea solo). `GOOGLE_BOOKS_API_KEY` es opcional: sin ella se usa la cuota pública de Google, más limitada. Tests: `npm test` en `api/` y `npx ng test --watch=false` en `web/`.

## Arquitectura

- **API** (`api/`): Express + SQLite (`better-sqlite3`) con validación `zod`. Expone `GET/POST /api/books` y `GET/PATCH/DELETE /api/books/:id`, más `GET /api/lookup?q=`: proxy a Google Books que devuelve hasta 10 candidatos normalizados; el buscador se inyecta en `createApp` para que los tests no toquen la red. Filtros por `status` y `q`, y orden con `sort` (`newest`, `oldest`, `title`, `author`), todo en el servidor.
- **Datos**: una tabla `books` (título, autor, ISBN, páginas, descripción, portada, estado, `pagesRead`, fechas). De la portada solo se guarda la URL (`coverUrl`), que el navegador carga directo; si falta o falla, la card muestra un placeholder. Al arrancar, la API agrega a una base existente las columnas nuevas, sin perder datos. Las reglas de negocio (estados y progreso) viven en `books.routes.ts`.
- **Frontend** (`web/`): Angular con componentes standalone y signals. Solo los archivos `*.api.ts` (`books.api.ts`, `lookup.api.ts`) hacen HTTP; en el alta, `book-lookup` busca en Google Books y precarga el formulario; `book-list` guarda la lista en un signal y actualiza en el lugar con las respuestas del servidor.
- **Contrato**: [api/openapi.yaml](api/openapi.yaml) es la fuente de verdad entre interfaz y servidor. El diseño completo está en el [spec del núcleo](docs/superpowers/specs/2026-10-07-scriptorium-core-design.md), el de la búsqueda en Google Books en el [spec de la búsqueda](docs/superpowers/specs/2026-10-12-google-books-lookup-design.md) y el de las portadas en el [spec de portadas](docs/superpowers/specs/2026-10-13-portadas-design.md).
- **Limitación conocida**: la búsqueda y el orden por título/autor ignoran mayúsculas solo para ASCII, así que "Ángel" y "angel" no se consideran iguales.

## Qué decidí yo

Las decisiones salieron del brainstorming de cada ciclo, respondiendo de a una pregunta con alternativas. Cada spec tiene una tabla de "Decisiones" con lo que elegí y lo que descarté.

**Reconstruir desde cero y no copiar el original.** Copiar la app vieja de una vez o reproducir su historial habría dejado un repo sin evidencia real del proceso. Preferí que cada pieza saliera de un spec y un plan, commit a commit.

**API propia + SQLite en vez de Firebase o Postgres.** La consigna pide persistencia del lado del servidor, y el original no tenía backend propio (solo una Function de Firebase como proxy). SQLite en un archivo alcanza para un solo usuario, no necesita levantar otro servicio y los tests corren contra `:memory:`.

**Un solo usuario, sin login.** Es una biblioteca personal. Agregar autenticación habría duplicado el alcance sin mejorar lo que se evalúa.

**Guardar `pagesRead` y no un porcentaje.** El original guardaba `readProgress` de 0 a 100. Con páginas, el servidor puede validar (`pagesRead ≤ pages`) y el porcentaje se calcula en el cliente. Guardar los dos habría abierto la puerta a que no coincidan.

**Las reglas de negocio en el servidor y en un solo lugar.** Que "leído" lleve `pagesRead` a `pages`, o que un `pagesRead` fuera de rango sea 422 y no se recorte en silencio, vive solo en `books.routes.ts`. El frontend muestra lo que el servidor devuelve y no actualiza antes de la respuesta: si el `PATCH` falla, el valor queda como estaba.

**Contrato OpenAPI antes que el código.** `openapi.yaml` se escribe y se actualiza antes de tocar una ruta. Es lo que me permite revisar si el agente devolvió lo que pedí, con una forma de error uniforme (`BAD_REQUEST`, `NOT_FOUND`, `VALIDATION_ERROR`, `UPSTREAM_ERROR`, `INTERNAL`).

**Filtros y orden en el servidor, `PATCH` parcial.** Los filtros son query params (`status`, `q`, `sort`) y el `PATCH` acepta cualquier subconjunto de campos. Descarté un `PUT` completo y un endpoint `/progress` aparte: el `+/-` del progreso es un `PATCH { pagesRead }` como cualquier otro.

**Google Books detrás de la API, no desde el navegador.** Llamar a Google directo desde el front habría expuesto la key y le habría quitado sentido al backend. El buscador se inyecta en `createApp`, como la db, así los tests nunca tocan la red. Solo Google (sin el fallback a OpenLibrary del original), sin caché, y la búsqueda se dispara con Enter o con el botón, no mientras se tipea, para no gastar cuota.

**De la portada solo la URL.** Descargar las imágenes o hacer de proxy habría sumado almacenamiento y otro endpoint. Guardo `coverUrl`, el navegador la carga y, si falla, la card muestra un placeholder. La URL se valida (`http`/`https`, máximo 2000 caracteres) para que no entre un `javascript:`. Para agregar la columna a una base existente elegí un `ALTER TABLE` idempotente al arrancar y no un sistema de migraciones: para una columna alcanza.

## Cómo gestioné el contexto

**Lo que tiene que sobrevivir entre sesiones está en disco, no en la conversación.**
- `CLAUDE.md` existe desde el primer commit. Tiene la tabla de decisiones, la estructura de carpetas, las reglas (contrato primero, reglas de negocio solo en `books.routes.ts`, solo los `*.api.ts` hacen HTTP, TDD, formato de commits) y los comandos. Lo fui actualizando en cada ciclo. Por ejemplo, la regla "solo `books.api.ts` hace HTTP" pasó a "solo los `*.api.ts`" cuando apareció `lookup.api.ts`.
- Cada feature tiene su spec y su plan, y cada spec nuevo nombra los ciclos anteriores. Una sesión nueva arranca leyendo esos archivos, no reconstruyendo lo que se habló.
- Las preferencias de cómo trabajo con el agente (preguntas de a una, sin atribución en commits) quedaron en la memoria persistente de Claude Code, para no repetirlas en cada sesión.

**Un subagente por tarea.** Ejecuté los planes con `subagent-driven-development`. Cada tarea la implementó un subagente nuevo con TDD, que solo recibía la tarea del plan y los archivos que tocaba, sin el historial de la conversación. Después de cada tarea, otro subagente revisó si cumplía el spec y la calidad del código. La sesión principal solo coordinaba, así que no se llenaba de diffs.

**Un ciclo chico por feature.** En lugar de un plan gigante, tres ciclos: núcleo, búsqueda y portadas. Cada uno entra en una sesión, y lo que queda afuera de un spec queda anotado en su sección "Fuera de alcance" para el ciclo siguiente.

## Prompts

El registro completo está en [prompts.md](prompts.md). Los que más pesaron son el de "commit a commit, no es un one shot", que cambió el plan de copiar la app vieja por reconstruirla, y los `brainstorming` de cada ciclo, donde cada decisión salió de una respuesta mía a una pregunta de opción múltiple. La mayoría de mis mensajes son aprobaciones cortas ("si, continua", "2", "directo"), así que cada uno va con la pregunta que respondía.

## Qué salió mal

**Versiones sin fijar.** En el primer scaffold de la API, el agente dejó todas las `devDependencies` en `"*"`. Funcionaba, pero cualquier `npm install` futuro podía traer una versión mayor nueva y romper los tests. Lo corregí fijándolas a la mayor actual (`4c9091e`).

**La regla de "leído" se aplicaba tarde.** En el `PATCH`, el servidor validaba `pagesRead ≤ pages` antes de aplicar la regla "si el estado es `read`, `pagesRead = pages`". Un libro con 120 páginas leídas al que se le mandaba `{ status: 'read', pages: null }` devolvía 422 ("pagesRead tiene que ser 0 si no hay pages"), cuando lo correcto era aceptarlo y dejar `pagesRead` en 0. Los tests de cada regla por separado pasaban: el error estaba en el orden. Lo corregí aplicando la regla antes de validar, con tests de las combinaciones (`d916fe3`).

**Lo que encontró la revisión de toda la rama.** Antes del PR #1 corrí una revisión de la rama completa, y salieron cosas que ninguna revisión por tarea había visto, porque aparecían al juntar las piezas:
- el formulario del modal conservaba los datos del libro anterior al volver a abrirlo;
- si el servidor rechazaba un cambio de estado, el `<select>` nativo se quedaba mostrando el valor rechazado;
- los errores del body distintos de un JSON mal formado devolvían 500 en vez de 400, y una ruta `/api` inexistente devolvía la página HTML de Express en vez del error JSON del contrato;
- el README pedía Node 20, cuando Angular 22 exige 22.22+ o 24.15+, y encadenaba los `cd` de una forma que no funcionaba si se copiaba tal cual.

Se corrigió todo en una ronda (`7e06825`, `6d1174f`, `d259b37`).

**El spec de portadas no cubrió todos los lugares donde una imagen puede fallar.** El spec definía un placeholder para la card y un mensaje para la vista previa del formulario, pero no qué pasaba con las miniaturas de los resultados de Google. Esas eran justo las que se veían como imagen rota. También la card quedaba angosta en el celular al pasar la portada arriba del contenido. Las dos cosas aparecieron después de implementar el plan y las corregí aparte (`ee52b2c`). Las partes 2 y 3 de ese spec las escribí directo, sin pasar por el brainstorming completo, y es el ciclo donde más quedó afuera.

**Dos features sin PR.** La búsqueda en Google Books y las portadas se hicieron en sus branches (`feature/google-books-lookup` y `feature/portadas`), pero las mergeé a `main` en local (`9a77799`, `8502093`) en vez de abrir un PR como con el núcleo. Los commits y los merges están en el historial, pero esas dos features no tienen un PR como evidencia visible. Abrir ahora PRs de algo ya mergeado sería armar evidencia después de los hechos, así que lo dejo registrado acá. Este informe entra por PR.
