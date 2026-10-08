# Scriptorium Núcleo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Núcleo de Scriptorium: API REST en Express con SQLite que persiste libros, y un frontend Angular que la consume (CRUD, 5 estados, progreso por páginas, filtros/orden).

**Architecture:** Dos paquetes hermanos dentro de `tp-final/`: `api/` (Express 5 + better-sqlite3 + zod, contrato en `api/openapi.yaml` escrito primero) y `web/` (Angular 22 standalone + signals). El servidor es la única fuente de verdad y aplica todas las reglas de negocio. En desarrollo, `ng serve` pasa `/api` a `localhost:3000` con un proxy.

**Tech Stack:** Node 24, TypeScript, Express 5.x, better-sqlite3 12.x, zod 4.x, Vitest 4.x + supertest, tsx; Angular CLI 22 (Vitest como runner, zoneless, SCSS).

**Spec:** `tp-final/docs/superpowers/specs/2026-10-07-scriptorium-core-design.md`

## Global Constraints

- Todas las rutas de archivo de este plan son relativas a `tp-final/`. El repo git es `riverosk-iisaia/` (padre).
- Estados exactos: `to-read` | `reading` | `read` | `borrowed` | `not-interested`; default `to-read`.
- Labels en la UI: Por leer, Leyendo, Leído, Prestado, No voy a leer.
- Base de la API: `/api`. Códigos de error: `BAD_REQUEST` (400), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `INTERNAL` (500). Forma: `{ "error": { "code", "message", "fields"? } }`; `fields` solo en 422.
- `sort` ∈ `newest` (default) | `oldest` | `title` | `author`.
- En las respuestas, los campos opcionales (`isbn`, `pages`, `description`) van como `null` cuando no tienen valor. Nunca se omiten. En POST/PATCH se pueden mandar como `null` para vaciarlos.
- Timestamps en ISO 8601 (`new Date().toISOString()`); `id` con `crypto.randomUUID()`.
- Variables de entorno de la API: `PORT` (default `3000`), `DB_PATH` (default `data/scriptorium.db`). `api/data/` va en `.gitignore`.
- Sin localStorage en el frontend.
- Mensajes de commit en español con prefijo `TP final:`. **Sin línea `Co-Authored-By`.**
- Paleta: #2d5016, #558b2f, #7cb342, acento #fbc02d, fondo #f5f5f5, error #d32f2f; Courier New; bordes 2-4px; sombra `6px 6px 0`.

## Review Focus

1. `q` con `%` o `_` (ej. `q=100%`) debe matchear el texto literal, no actuar como comodín de LIKE → test en Task 3.
2. Body JSON malformado (`{"title":`) debe responder 400 `BAD_REQUEST` con la forma de error, no 500 ni el HTML de Express → test en Task 2.
3. `title`/`author` de solo espacios (`"   "`) debe ser 422, igual que vacío; los valores se guardan sin espacios a los costados → test en Task 2.
4. `pages`/`pagesRead` no enteros (`12.5`, `"12"`) deben ser 422, no truncarse ni convertirse en silencio → test en Task 2.
5. Tipear rápido en el buscador: si una respuesta vieja llega después de una nueva, la lista debe mostrar la de la última búsqueda → test en Task 8.

---

### Task 1: CLAUDE.md, contrato OpenAPI y esqueleto de la API

**Files:**
- Create: `CLAUDE.md`
- Create: `api/openapi.yaml`
- Create: `api/package.json`, `api/tsconfig.json`, `api/vitest.config.ts`, `api/.gitignore`
- Create: `api/src/db.ts`
- Test: `api/test/db.test.ts`

**Interfaces:**
- Produces: `openDb(path: string): Database.Database` (better-sqlite3). Con `":memory:"` abre una base en memoria. Crea la tabla `books` si no existe (`CREATE TABLE IF NOT EXISTS`) con las columnas del spec: `id TEXT PRIMARY KEY`, `title TEXT NOT NULL`, `author TEXT NOT NULL`, `isbn TEXT`, `pages INTEGER`, `description TEXT`, `status TEXT NOT NULL`, `pagesRead INTEGER NOT NULL DEFAULT 0`, `createdAt TEXT NOT NULL`, `updatedAt TEXT NOT NULL`.

- [ ] **Step 1: Escribir `CLAUDE.md`**

Contenido mínimo, sin paja:
- qué es el proyecto, en una línea;
- link al spec y al plan;
- la tabla de "Decisiones" del spec, resumida;
- estructura `api/` y `web/` con la responsabilidad de cada archivo;
- reglas: el contrato es `api/openapi.yaml` y se actualiza **antes** de cambiar una ruta; las reglas de negocio solo viven en `books.routes.ts`; en el front solo `books.api.ts` hace HTTP; TDD; commits `TP final: …` sin Co-Authored-By;
- comandos: `npm test` / `npm run dev` en cada paquete.

- [ ] **Step 2: Escribir `api/openapi.yaml`** (OpenAPI 3.1)

Schemas `Book`, `BookInput` (POST: `title` y `author` requeridos), `BookPatch` (todo opcional, `minProperties: 1`), `Status` (enum) y `Error`. Los 5 endpoints del spec con todos sus status codes y el header `Location` en el 201. Los query params `status`, `q` y `sort` con enum y default `newest`. `pages` como `integer, minimum: 1, nullable`; `pagesRead` como `integer, minimum: 0`. En la descripción de PATCH van las reglas de negocio 1-5 del spec.

- [ ] **Step 3: Validar el contrato**

Run: `cd api && npx @redocly/cli@latest lint openapi.yaml`
Expected: `Woohoo! Your API description is valid.` (los warnings de licencia/servers se pueden ignorar)

- [ ] **Step 4: Esqueleto del paquete**

`package.json` con `"type": "module"` y los scripts `"test": "vitest run"`, `"dev": "tsx watch src/server.ts"`, `"start": "tsx src/server.ts"`. Dependencias: `express@^5`, `better-sqlite3@^12`, `zod@^4`. devDependencies: `typescript`, `tsx`, `vitest`, `supertest`, `@types/express`, `@types/better-sqlite3`, `@types/supertest`, `@types/node`. `tsconfig` strict, `module`/`moduleResolution` `NodeNext`. `.gitignore`: `node_modules/`, `data/`.

- [ ] **Step 5: Test que falla**

```ts
// api/test/db.test.ts
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { openDb } from '../src/db.js';

test('crea la tabla books en memoria', () => {
  const db = openDb(':memory:');
  const cols = db.prepare("PRAGMA table_info(books)").all().map((c: any) => c.name);
  expect(cols).toEqual(['id','title','author','isbn','pages','description','status','pagesRead','createdAt','updatedAt']);
});

test('los datos sobreviven a cerrar y reabrir el archivo', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'scr-')), 'test.db');
  const a = openDb(path);
  a.prepare("INSERT INTO books VALUES ('1','T','A',NULL,NULL,NULL,'to-read',0,'x','x')").run();
  a.close();
  expect(openDb(path).prepare('SELECT title FROM books').get()).toEqual({ title: 'T' });
});
```

- [ ] **Step 6:** Run `cd api && npm install && npm test` → FAIL (no existe `../src/db.js`)
- [ ] **Step 7:** Implementar `openDb` en `api/src/db.ts`. Crear el directorio padre del archivo si no existe (`mkdirSync(dirname(path), { recursive: true })`, salvo con `:memory:`).
- [ ] **Step 8:** Run `npm test` → PASS (2 tests)
- [ ] **Step 9: Commit**

```bash
git add tp-final/CLAUDE.md tp-final/api
git commit -m "TP final: CLAUDE.md, contrato OpenAPI y base SQLite"
```

---

### Task 2: Repo, app Express, POST y GET por id, middleware de errores

**Files:**
- Create: `api/src/books.repo.ts`, `api/src/books.schema.ts`, `api/src/books.routes.ts`, `api/src/errors.ts`, `api/src/app.ts`, `api/src/server.ts`
- Test: `api/test/books.create.test.ts`, `api/test/helpers.ts`

**Interfaces:**
- Consumes: `openDb` (Task 1).
- Produces (los usan las Tasks 3-4):
  - `api/src/books.repo.ts`:
    ```ts
    export type Status = 'to-read'|'reading'|'read'|'borrowed'|'not-interested';
    export type Sort = 'newest'|'oldest'|'title'|'author';
    export interface Book { id: string; title: string; author: string; isbn: string|null; pages: number|null;
      description: string|null; status: Status; pagesRead: number; createdAt: string; updatedAt: string; }
    export type BookFields = Omit<Book, 'id'|'createdAt'|'updatedAt'>;
    export function createBooksRepo(db: Database.Database): {
      list(f: { status?: Status; q?: string; sort: Sort }): Book[];
      get(id: string): Book | undefined;
      create(fields: BookFields): Book;           // genera id, createdAt = updatedAt = ahora
      update(id: string, fields: BookFields): Book | undefined; // reemplaza los campos, updatedAt = ahora
      remove(id: string): boolean;
    }
    ```
    El repo no valida nada: recibe `BookFields` completos ya resueltos por la ruta.
  - `api/src/errors.ts`: `class HttpError extends Error { constructor(status: number, code: string, message: string, fields?: Record<string,string>) }` y `errorHandler: ErrorRequestHandler`.
  - `api/src/books.schema.ts`: `bookCreateSchema`, `bookPatchSchema`, `listQuerySchema` (zod).
  - `api/src/app.ts`: `createApp(db: Database.Database): express.Express`. Monta `express.json()`, el router en `/api/books` y `errorHandler`.
  - `api/test/helpers.ts`: `makeApp()` devuelve `request(createApp(openDb(':memory:')))` (supertest agent).

- [ ] **Step 1: Tests que fallan** (`api/test/books.create.test.ts`)

```ts
test('POST crea con defaults y devuelve 201 + Location', async () => {
  const api = makeApp();
  const res = await api.post('/api/books').send({ title: '  Rayuela ', author: 'Cortázar' });
  expect(res.status).toBe(201);
  expect(res.headers.location).toBe(`/api/books/${res.body.id}`);
  expect(res.body).toMatchObject({ title: 'Rayuela', author: 'Cortázar', isbn: null, pages: null,
    description: null, status: 'to-read', pagesRead: 0 });
  expect(res.body.createdAt).toBe(res.body.updatedAt);
});
test('GET /:id devuelve el libro creado', …);               // 200, body igual al del POST
test('GET /:id inexistente → 404 NOT_FOUND', …);            // body.error.code === 'NOT_FOUND'
test('POST sin title → 422 con fields.title', …);
test('POST con title "   " → 422 con fields.title', …);     // Review Focus 3
test.each([[0],[-3],[12.5],['12']])('POST pages=%s → 422 fields.pages', …); // Review Focus 4
test('POST ignora id/createdAt/updatedAt del body', …);     // regla 5: id distinto de 'x'
test('POST status read con pages 300 → pagesRead 300', …);  // regla 1
test('POST pagesRead 10 sin pages → 422 fields.pagesRead', …); // regla 2
test('POST pagesRead 500 con pages 300 → 422 fields.pagesRead', …); // regla 3
test('JSON malformado → 400 BAD_REQUEST', async () => {    // Review Focus 2
  const res = await makeApp().post('/api/books').set('Content-Type','application/json').send('{"title":');
  expect(res.status).toBe(400); expect(res.body.error.code).toBe('BAD_REQUEST');
});
```

- [ ] **Step 2:** Run `npm test` → FAIL (faltan los módulos)
- [ ] **Step 3: Implementar**
  - Schemas zod: strings con `.trim().min(1)` para title/author. `pages`: `z.number().int().min(1).nullable()`. `pagesRead`: `z.number().int().min(0)`. Los objetos son `z.object` no estrictos, para que los campos del servidor se descarten.
  - En `books.routes.ts`, una función privada `resolve(current: BookFields | null, input): BookFields` mezcla el input sobre el estado actual (o sobre los defaults), aplica las reglas 1-3 y lanza `HttpError(422, …, { pagesRead: … })`. Es el único lugar con reglas de negocio.
  - `errorHandler`: `ZodError` → 422 con `fields` (primer mensaje por path). `HttpError` → su status. Un error con `type === 'entity.parse.failed'` (body-parser) → 400 `BAD_REQUEST`. Cualquier otro → `console.error` y 500 `INTERNAL`, con mensaje genérico.
  - `server.ts`: `createApp(openDb(process.env.DB_PATH ?? 'data/scriptorium.db')).listen(PORT)`.
- [ ] **Step 4:** Run `npm test` → PASS
- [ ] **Step 5: Commit** — `git commit -m "TP final: POST y GET de libros con validación y errores"`

---

### Task 3: GET /books con filtros y orden

**Files:**
- Modify: `api/src/books.repo.ts` (`list`), `api/src/books.routes.ts`
- Test: `api/test/books.list.test.ts`

**Interfaces:**
- Consumes: `createBooksRepo`, `listQuerySchema`, `makeApp` (Task 2).

- [ ] **Step 1: Tests que fallan**

Fixture: crear por POST, en este orden, `{title:'b-libro', author:'Zeta', status:'reading'}`, `{title:'A-libro', author:'alfa', isbn:'978-1'}` y `{title:'100% real', author:'Mu'}`.

```ts
test('sin params ordena newest: el último creado primero', …);  // ['100% real','A-libro','b-libro']
test('sort=oldest', …);                                           // orden inverso
test('sort=title ignora mayúsculas', …);                          // ['100% real','A-libro','b-libro']
test('sort=author ignora mayúsculas', …);                         // ['A-libro'(alfa),'100% real'(Mu),'b-libro'(Zeta)]
test('status=reading filtra', …);                                 // solo 'b-libro'
test('q busca en title, author e isbn sin distinguir mayúsculas', …); // q=ZETA → b-libro; q=978 → A-libro
test('q con % es literal', …);                                    // q=% → solo '100% real' (Review Focus 1)
test('q con _ es literal', …);                                    // q=_ → []
test('status inválido → 400 BAD_REQUEST', …);
test('sort inválido → 400 BAD_REQUEST', …);
```

- [ ] **Step 2:** Run `npm test` → FAIL
- [ ] **Step 3: Implementar**
  - `list`: armar el SQL con `WHERE` opcionales. `q` va con `LIKE ? ESCAPE '\'`, después de escapar `\`, `%` y `_` en el valor, sobre `title`, `author` y `isbn`. El orden sale de un mapa fijo `Sort → ORDER BY`: nunca se interpola el input del usuario. `newest` usa `createdAt DESC, rowid DESC` (desempata si dos libros se crearon en el mismo milisegundo). `title`/`author` usan `COLLATE NOCASE`.
  - La ruta valida el query con `listQuerySchema`. Un error del query responde 400 `BAD_REQUEST`, no 422: hay que distinguirlo en la ruta.
- [ ] **Step 4:** Run `npm test` → PASS
- [ ] **Step 5: Commit** — `git commit -m "TP final: listado con filtros y orden"`

---

### Task 4: PATCH y DELETE con reglas de negocio

**Files:**
- Modify: `api/src/books.routes.ts`
- Test: `api/test/books.update.test.ts`

**Interfaces:**
- Consumes: `resolve`, `bookPatchSchema`, el repo (Task 2).

- [ ] **Step 1: Tests que fallan** (cada uno parte de un libro creado `{title:'T', author:'A', pages:300}`)

```ts
test('PATCH parcial cambia solo lo enviado y actualiza updatedAt', …); // title nuevo; author igual; updatedAt > createdAt
test('PATCH status read fija pagesRead = pages', …);                   // regla 1 → 300
test('PATCH pagesRead 301 → 422 fields.pagesRead', …);                  // regla 3
test('PATCH pagesRead -1 → 422', …);
test('PATCH pages 50 con pagesRead actual 120 → 422 fields.pages', …);  // regla 4
test('PATCH pages 50 + pagesRead 10 → 200', …);                         // regla 4, caso válido
test('PATCH pages null con pagesRead > 0 → 422', …);                   // regla 2
test('PATCH {} → 422', …);
test('PATCH isbn null vacía el campo', …);
test('PATCH id inexistente → 404', …);
test('DELETE → 204 y después GET → 404', …);
test('DELETE inexistente → 404', …);
```

Para `updatedAt > createdAt`, usar `vi.useFakeTimers({ toFake: ['Date'] })` y `vi.setSystemTime` entre el POST y el PATCH.

- [ ] **Step 2:** Run `npm test` → FAIL
- [ ] **Step 3: Implementar** las rutas PATCH y DELETE, reusando `resolve(current, patch)`. La regla 4 sale sola: se mezcla el patch sobre el libro actual y se valida la regla 3 sobre el resultado. El 422 apunta a `fields.pages` cuando el patch cambió `pages` pero no `pagesRead`.
- [ ] **Step 4:** Run `npm test` → PASS (todas las suites de la API)
- [ ] **Step 5: Smoke manual** — `npm run dev`; en otra terminal, `curl -s -XPOST localhost:3000/api/books -H 'content-type: application/json' -d '{"title":"x","author":"y"}'`. Cortar el server, volver a levantarlo y comprobar que `curl -s localhost:3000/api/books` todavía devuelve el libro.
- [ ] **Step 6: Commit** — `git commit -m "TP final: PATCH y DELETE con reglas de progreso"`

---

### Task 5: Proyecto Angular, proxy y cliente HTTP

**Files:**
- Create: `web/` (via CLI), `web/proxy.conf.json`
- Create: `web/src/app/books.api.ts`, `web/src/app/book.model.ts`, `web/src/app/api-error.ts`
- Modify: `web/angular.json` (`serve.options.proxyConfig`), `web/src/app/app.config.ts` (`provideHttpClient()`)
- Test: `web/src/app/books.api.spec.ts`, `web/src/app/api-error.spec.ts`

**Interfaces:**
- Produces:
  - `book.model.ts`: los mismos `Status`, `Sort` y `Book` de la Task 2 (copiados, son el contrato), más `type BookInput = Partial<Pick<Book,'title'|'author'|'isbn'|'pages'|'description'|'status'|'pagesRead'>>` y `const STATUS_LABELS: Record<Status, string>` con los labels de Global Constraints.
  - `books.api.ts`: `@Injectable({providedIn:'root'}) class BooksApi` con `list(p: {status?: Status; q?: string; sort?: Sort}): Observable<Book[]>`, `create(i: BookInput): Observable<Book>`, `update(id: string, p: BookInput): Observable<Book>` y `remove(id: string): Observable<void>`. Base URL `/api/books`.
  - `api-error.ts`: `type UiError = {kind:'validation'; fields: Record<string,string>} | {kind:'offline'} | {kind:'other'; message: string}` y `toUiError(e: HttpErrorResponse): UiError`. `status 0` → offline; 422 → validation; el resto → other con `error.error.message` o un texto genérico.

- [ ] **Step 1: Crear el proyecto**

Run: `cd tp-final && npx @angular/cli@22 new web --style=scss --skip-git --ssr=false --defaults`. Después, en `proxy.conf.json`: `{ "/api": { "target": "http://localhost:3000", "secure": false } }`.

- [ ] **Step 2: Tests que fallan** (con `provideHttpClient()` y `provideHttpClientTesting()`)

```ts
it('list sin filtros pide GET /api/books sin params', …);
it('list omite params vacíos y manda los definidos', …); // {status:'reading', q:'', sort:'title'} → ?status=reading&sort=title
it('update hace PATCH /api/books/:id con el body', …);
it('remove hace DELETE /api/books/:id', …);
it('toUiError: status 0 → offline; 422 → validation con fields; 404 → other con message', …);
```

- [ ] **Step 3:** Run `cd web && npx ng test --watch=false` → FAIL
- [ ] **Step 4:** Implementar los tres archivos.
- [ ] **Step 5:** Run `npx ng test --watch=false` → PASS
- [ ] **Step 6: Commit** — `git commit -m "TP final: proyecto Angular y cliente de la API"`

---

### Task 6: Componentes presentacionales — progress-bar, status-selector, modal-overlay

**Files:**
- Create: `web/src/app/progress-bar/progress-bar.ts`, `web/src/app/status-selector/status-selector.ts`, `web/src/app/modal-overlay/modal-overlay.ts` (cada uno con su `.scss`)
- Test: `web/src/app/progress-bar/progress-bar.spec.ts`

**Interfaces:**
- Produces:
  - `ProgressBarComponent` (`app-progress-bar`): `pages = input.required<number>()`, `pagesRead = input.required<number>()`, `disabled = input(false)`, `increment = output<void>()`, `decrement = output<void>()`. Muestra `Math.round(pagesRead/pages*100)%` y `"{pagesRead} / {pages} páginas"`. El botón − se deshabilita en 0, el + en `pages`, y ambos con `disabled`. Botones con `aria-label` "Restar una página" / "Sumar una página".
  - `StatusSelectorComponent` (`app-status-selector`): `status = input<Status | ''>()`, `allowAll = input(false)` (agrega la opción "Todos" con valor `''`), `label = input('Estado')`, `statusChange = output<Status | ''>()`.
  - `ModalOverlayComponent` (`app-modal-overlay`): `open = input.required<boolean>()`, `title = input('')`, `closed = output<void>()`. Usa `<ng-content>`. Se cierra con Escape y con click en el fondo.

- [ ] **Step 1: Tests que fallan** (progress-bar)

```ts
it('muestra 40% y "120 / 300 páginas"', …);
it('+ emite increment; − emite decrement', …);
it('disabled deshabilita ambos botones', …);
it('− deshabilitado en 0 y + deshabilitado en pages', …);
```

- [ ] **Step 2:** Run `npx ng test --watch=false` → FAIL
- [ ] **Step 3:** Implementar los tres componentes con los estilos neobrutalistas de Global Constraints.
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5: Commit** — `git commit -m "TP final: barra de progreso, selector de estado y modal"`

---

### Task 7: book-form

**Files:**
- Create: `web/src/app/book-form/book-form.ts` (+ `.scss`)
- Test: `web/src/app/book-form/book-form.spec.ts`

**Interfaces:**
- Consumes: `StatusSelectorComponent`, `Book`, `BookInput` (Tasks 5-6).
- Produces: `BookFormComponent` (`app-book-form`): `book = input<Book | null>(null)` (null = alta), `serverErrors = input<Record<string,string> | null>(null)`, `save = output<BookInput>()`, `cancelled = output<void>()` (no `cancel`: choca con el evento nativo del DOM). Reactive forms. El botón dice "Agregar libro" en alta y "Guardar cambios" en edición. Campos: title, author, isbn, pages, description, status. `pagesRead` no se edita acá: se mueve con +/- desde la card. Los campos vacíos se emiten como `null`; `pages` se emite como número.

- [ ] **Step 1: Tests que fallan**

```ts
it('no emite save si title o author están vacíos o con solo espacios', …);
it('emite save con los valores, sin espacios a los costados y opcionales vacíos como null', …);
it('en edición precarga los valores del book y el botón dice "Guardar cambios"', …);
it('muestra serverErrors.pages debajo del input pages', …);
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Run → PASS
- [ ] **Step 5: Commit** — `git commit -m "TP final: formulario de libro"`

---

### Task 8: book-card, book-list y la app armada

**Files:**
- Create: `web/src/app/book-card/book-card.ts`, `web/src/app/book-list/book-list.ts` (+ `.scss`)
- Modify: `web/src/app/app.ts`, `web/src/app/app.html`, `web/src/styles.scss`
- Test: `web/src/app/book-list/book-list.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - `BookCardComponent` (`app-book-card`): `book = input.required<Book>()`, `edit = output<Book>()`, `remove = output<Book>()` (solo después de `confirm('¿Eliminar "<title>"?')`), `statusChange = output<Status>()`, `progressChange = output<number>()` (el `pagesRead` nuevo). Muestra `app-progress-bar` solo si `status` es `reading` o `read` y hay `pages`, con `disabled` en `read`. El color del borde depende del estado.
  - `BookListComponent` (`app-book-list`): es la página. Tiene los signals `books`, `status`, `q`, `sort`, `error: UiError | null`, `editing: Book | null | undefined` (`undefined` = modal cerrado, `null` = alta) y `formErrors`. La toolbar tiene el buscador, el selector de estado (`allowAll`), el orden y el botón "+ Agregar". Los cambios de filtro pasan por un `Subject` → `debounceTime(300)` solo para `q` → `switchMap(api.list)`. Alta, edición y baja actualizan `books` en el lugar con la respuesta. Un error de progreso no cambia nada y deja el error en `error`. Un 422 del form va a `formErrors` y el modal sigue abierto.
  - `App`: header "Scriptorium — Tu biblioteca personal" y `<app-book-list/>`.

- [ ] **Step 1: Tests que fallan** (book-list, con `HttpTestingController` y `vi.useFakeTimers()`)

```ts
it('al iniciar pide /api/books y renderiza una card por libro', …);
it('una respuesta vieja que llega tarde no pisa la última búsqueda', …); // Review Focus 5:
  // tipear 'a', avanzar 300ms, tipear 'ab', avanzar 300ms; la request de 'a' queda cancelada
  // (expect(req1.cancelled).toBe(true)); responder la de 'ab' → solo se ven sus libros
it('progressChange manda PATCH {pagesRead} y reemplaza la card con la respuesta', …);
it('si el PATCH de progreso falla, la card conserva el valor anterior y se muestra el error', …);
it('error de red al listar muestra "Sin conexión con el servidor"', …);
```

- [ ] **Step 2:** Run → FAIL
- [ ] **Step 3:** Implementar la card, la lista, la app y los estilos globales (grid `repeat(auto-fill, minmax(280px, 1fr))` desde 768px, 1 columna abajo de eso).
- [ ] **Step 4:** Run `npx ng test --watch=false` → PASS
- [ ] **Step 5: Verificación end-to-end manual** — `cd api && npm run dev` y `cd web && npx ng serve`. En `http://localhost:4200`: crear un libro con 300 páginas, pasarlo a Leyendo, sumar páginas, pasarlo a Leído (100%, botones deshabilitados), filtrar, ordenar, editar, borrar. Reiniciar la API y comprobar que los datos siguen.
- [ ] **Step 6: Actualizar `README.md`**: completar la sección "Cómo se ejecuta" (requisitos, `npm install` en los dos paquetes, `PORT`/`DB_PATH`, los dos comandos) y "Arquitectura" (link al spec y a `openapi.yaml`). Las secciones de reflexión ("Qué decidí yo", etc.) las escribe Tadeo.
- [ ] **Step 7: Commit** — `git commit -m "TP final: lista de libros y app completa"`
