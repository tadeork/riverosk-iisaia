# Scriptorium Búsqueda en Google Books — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde el modal "+ Agregar", buscar en Google Books a través de `GET /api/lookup`, elegir un resultado y precargar el formulario de alta.

**Architecture:** La API recibe un buscador inyectable (`BookSearch`) en `createApp(db, { search })`. `google-books.ts` implementa ese buscador contra Google y normaliza a `BookCandidate`, y `lookup.routes.ts` solo valida `q` y delega. Los tests usan un `fetch` falso o un `search` falso, así que nunca tocan la red. En el front, `LookupApi` hace el HTTP, `book-lookup` muestra el buscador y emite `picked`, y `book-list` pasa el candidato a `book-form` como `prefill`.

**Tech Stack:** el mismo del núcleo: Node 24, Express 5, zod 4, Vitest 4 + supertest; Angular 22 (standalone, signals, zoneless) con Vitest. Se usan `fetch`, `AbortSignal.timeout` y `Response`, que vienen globales en Node 24. No se agregan dependencias.

**Spec:** `tp-final/docs/superpowers/specs/2026-10-12-google-books-lookup-design.md`

## Global Constraints

- Todas las rutas de archivo son relativas a `tp-final/`. El repo git es el padre `riverosk-iisaia/`. Rama: `feature/google-books-lookup`.
- Endpoint: `GET /api/lookup?q=` → 200 `BookCandidate[]`, con 10 como máximo.
  - `q` se recorta; si queda vacío o tiene más de 200 caracteres → 400 `BAD_REQUEST`.
  - Si Google falla → 502 `UPSTREAM_ERROR` con el mensaje `No se pudo consultar Google Books`.
- `BookCandidate = { title: string; author: string; isbn: string | null; pages: number | null; description: string | null }`. Los opcionales van siempre como `null` y nunca se omiten.
- Request a Google: `https://www.googleapis.com/books/v1/volumes` con `q`, `maxResults=10`, `printType=books`, y `key` solo si hay key. Los params se arman con `URLSearchParams`. Timeout: 5000 ms.
- La key (`GOOGLE_BOOKS_API_KEY`, opcional) nunca aparece en respuestas al cliente ni en logs.
- Textos exactos de la UI:
  - label `Buscar en Google Books`, botón `Buscar`, carga `Buscando…`;
  - sin resultados: `No se encontraron libros.`;
  - error de Google: `No se pudo consultar Google Books. Probá de nuevo o cargalo a mano.`;
  - sin conexión: `Sin conexión con el servidor`;
  - después de elegir: `Datos cargados desde Google Books: revisalos antes de guardar.`
- Cada resultado se muestra como `Título — Autor`, más ` · N págs.` si tiene páginas.
- En el front solo los archivos `*.api.ts` hacen HTTP.
- TDD: cada test se ve fallar antes de escribir el código.
- Commits en español con prefijo `TP final:`. **Sin línea `Co-Authored-By`.** No commitear el `.DS_Store` de la raíz.
- Comandos: en `api/`, `npm test` y `npx tsc --noEmit`; en `web/`, `npx ng test --watch=false` y `npx ng build`. Contrato: `npx @redocly/cli@latest lint openapi.yaml`, desde `api/`.

## Review Focus

1. `?q=a&q=b`: Express 5 entrega un array, y la respuesta debe ser 400 `BAD_REQUEST`, no 500. Test en Task 2.
2. Google responde 200 con ítems rotos (sin `volumeInfo`, con `authors: []` o con `pageCount` decimal): esos ítems se descartan o se normalizan sin tirar 500. Test en Task 1.
3. Dos búsquedas seguidas en las que la primera responde tarde: se muestran los resultados de la última. Test en Task 3.
4. Cerrar el modal después de elegir un candidato y volver a abrir "+ Agregar": el formulario está vacío y el buscador en idle. Test en Task 5.
5. Elegir un resultado y después buscar de nuevo: desaparece el aviso de datos cargados y se ven los resultados nuevos. Test en Task 3.

---

### Task 1: Contrato OpenAPI y adaptador de Google Books

**Files:**
- Modify: `api/openapi.yaml`
  - agregar el path `/lookup`;
  - agregar el schema `BookCandidate`;
  - agregar `UPSTREAM_ERROR` al enum `code` de `Error`;
  - agregar la response `BadGateway`.
- Create: `api/src/lookup/google-books.ts`
- Test: `api/test/google-books.test.ts`

**Interfaces:**
- Produces (exportados desde `api/src/lookup/google-books.ts`):
  - `interface BookCandidate { title: string; author: string; isbn: string | null; pages: number | null; description: string | null }`
  - `type BookSearch = (q: string) => Promise<BookCandidate[]>`
  - `function createGoogleBooksSearch(opts?: { apiKey?: string; fetch?: typeof fetch; timeoutMs?: number }): BookSearch`. Defaults: el `fetch` global y `timeoutMs = 5000`.

- [ ] **Step 1: Contrato.** Agregar a `openapi.yaml`:
  - `GET /lookup`, con `operationId: lookupBooks` y el parámetro `q` (query, required, `type: string`, `maxLength: 200`). La descripción del parámetro dice que se recorta y que vacío → 400;
  - responses: `200` (array de `BookCandidate`, `maxItems: 10`), `400` BadRequest, `502` BadGateway y `500` Internal;
  - el schema `BookCandidate`, con los 5 campos como `required` y los opcionales como `[string|integer, 'null']`;
  - la response `BadGateway`: "Google Books no respondió o respondió con error (`UPSTREAM_ERROR`)".

  Correr `npx @redocly/cli@latest lint openapi.yaml`. Esperado: sin errores. El warning de licencia ya estaba y queda aparcado.

- [ ] **Step 2: Tests que fallan.** Escribir `api/test/google-books.test.ts`.
  - **Fixtures** con la forma real de Google, por ejemplo `{ kind, totalItems, items: [{ id, volumeInfo: {...} }] }`.
  - **Fetch falso:** `fakeFetch(body, init?)` devuelve `vi.fn(async () => new Response(JSON.stringify(body), init))` y guarda la URL pedida.
  - **Tests:**
    - `normaliza un volumen completo`: `volumeInfo` con `title: 'Rayuela'`, `authors: ['Julio Cortázar']`, `industryIdentifiers: [{type:'ISBN_10',identifier:'8437604575'},{type:'ISBN_13',identifier:'9788437604572'}]`, `pageCount: 736` y `description: 'Novela'`. Resultado: `toEqual([{ title:'Rayuela', author:'Julio Cortázar', isbn:'9788437604572', pages:736, description:'Novela' }])`.
    - `subtítulo y varios autores`: `title:'Good Omens', subtitle:'The Nice and Accurate Prophecies', authors:['Terry Pratchett','Neil Gaiman']` → title `'Good Omens: The Nice and Accurate Prophecies'` y author `'Terry Pratchett, Neil Gaiman'`.
    - `ISBN_10 si no hay ISBN_13; null si no hay ninguno`: probar `[{type:'ISBN_10',...}]`, `[{type:'OTHER',identifier:'X'}]` y la ausencia de `industryIdentifiers`.
    - `pages null si pageCount falta, es 0 o no es entero`: probar ausente, `0` y `12.5`, y en los tres casos `pages: null`.
    - `description null si falta`.
    - `descarta ítems sin title, sin authors, con authors vacío o sin volumeInfo`: 4 ítems rotos más 1 válido → un solo resultado.
    - `sin items → []`: body `{ kind:'books#volumes', totalItems: 0 }`.
    - `arma la URL con q codificado y sin key`: `search('harry & potter')`. La URL pedida empieza con `https://www.googleapis.com/books/v1/volumes?`. Su `searchParams` tiene `q === 'harry & potter'`, `maxResults === '10'` y `printType === 'books'`, y no tiene `key`.
    - `agrega key si está configurada`: con `apiKey: 'K123'`, `searchParams.get('key') === 'K123'`.
    - `no-2xx → HttpError 502 UPSTREAM_ERROR`: con `new Response('{}', { status: 500 })`, `rejects.toMatchObject({ status: 502, code: 'UPSTREAM_ERROR', message: 'No se pudo consultar Google Books' })`.
    - `JSON inválido → 502`: con `new Response('<html>', { status: 200 })`.
    - `error de red → 502`: con un fetch que hace `throw new TypeError('fetch failed')`.
    - `timeout → 502`: con un fetch que devuelve una promesa que rechaza cuando se dispara `init.signal` (evento `abort`), y `timeoutMs: 20`.
    - `el error no incluye la key ni la URL`: con `apiKey: 'K123'` y un fetch que falla, el `message` del error no contiene `K123` ni `googleapis`.

  Correr `npm test -- google-books`. Esperado: FAIL, porque el módulo no existe.

- [ ] **Step 3: Implementar `createGoogleBooksSearch` en `api/src/lookup/google-books.ts`.**
  - Tipar la respuesta de Google como datos sin validar (`unknown` con narrowing, o tipos opcionales).
  - Hacer `fetch(url, { signal: AbortSignal.timeout(timeoutMs) })`.
  - Envolver `fetch`, `res.ok` y `res.json()` en un único `try/catch` que relance `new HttpError(502, 'UPSTREAM_ERROR', 'No se pudo consultar Google Books')`. No logear nada.
  - Normalizar según la tabla del spec. `Number.isInteger(pageCount) && pageCount > 0`.

- [ ] **Step 4: Verificar.** Correr `npm test` y `npx tsc --noEmit`. Esperado: todo PASS y tsc limpio.

- [ ] **Step 5: Commit.**
```bash
git add tp-final/api/openapi.yaml tp-final/api/src/lookup/google-books.ts tp-final/api/test/google-books.test.ts
git commit -m "TP final: contrato de /api/lookup y adaptador de Google Books"
```

### Task 2: Ruta `GET /api/lookup` e inyección del buscador

**Files:**
- Create: `api/src/lookup/lookup.routes.ts`
- Modify:
  - `api/src/app.ts`;
  - `api/src/server.ts`;
  - `api/test/helpers.ts`;
  - `README.md`: solo el párrafo de variables de entorno en "Cómo se ejecuta";
  - `CLAUDE.md`: estructura, reglas y variables de entorno.
- Test: `api/test/lookup.test.ts`

**Interfaces:**
- Consumes: `BookSearch` y `BookCandidate` de Task 1, y `HttpError` de `errors.ts`.
- Produces:
  - `lookupRouter(search: BookSearch): Router`;
  - `createApp(db: Database.Database, deps: { search: BookSearch }): express.Express`;
  - `makeApp(search: BookSearch = async () => [])` en `test/helpers.ts`. Los tests existentes siguen llamando `makeApp()` sin cambios.

- [ ] **Step 1: Tests que fallan.** Escribir `api/test/lookup.test.ts`. Usar `makeApp(search)` con un `search = vi.fn(async () => [CANDIDATE])`.
  - `200 con los candidatos y q recortado`: `GET /api/lookup?q=%20rayuela%20` responde 200, el body es `toEqual([CANDIDATE])` y `search` se llamó con `'rayuela'`.
  - `200 [] sin resultados`.
  - `q ausente, vacío, de solo espacios o de 201 caracteres → 400 BAD_REQUEST`: un test por caso o `test.each`. En todos, `search` no se llamó.
  - `q de exactamente 200 caracteres → 200`.
  - `q repetido (?q=a&q=b) → 400 BAD_REQUEST`.
  - `502 se propaga con la forma de error`: `search` rechaza con `new HttpError(502,'UPSTREAM_ERROR','No se pudo consultar Google Books')`. La respuesta es 502 y el body es `toEqual({ error: { code: 'UPSTREAM_ERROR', message: 'No se pudo consultar Google Books' } })`. Además, `JSON.stringify(body)` no contiene `googleapis`.

  Correr `npm test -- lookup`. Esperado: FAIL, porque la ruta no existe y devuelve 404.

- [ ] **Step 2: Implementar.**
  - `lookup.routes.ts`:
    - `const lookupQuerySchema = z.object({ q: z.string().trim().min(1).max(200) })`. El límite de 200 se aplica después del recorte;
    - si `safeParse` falla → `HttpError(400, 'BAD_REQUEST', 'Invalid query parameters')`;
    - si no, `res.json(await search(q))`. Express 5 propaga los rechazos de handlers `async`.
  - `app.ts`: montar `app.use('/api/lookup', lookupRouter(deps.search))` antes del catch-all de `/api`.
  - `server.ts`: `createApp(db, { search: createGoogleBooksSearch({ apiKey: process.env.GOOGLE_BOOKS_API_KEY || undefined }) })`.
  - `helpers.ts`: pasar el `search` recibido.

- [ ] **Step 3: Verificar.** Correr `npm test` y `npx tsc --noEmit`. Esperado: los 50 tests previos más los nuevos en PASS, y tsc limpio.

- [ ] **Step 4: Docs.**
  - `README.md` → en "Cómo se ejecuta", agregar al párrafo de variables `GOOGLE_BOOKS_API_KEY` (opcional; sin ella se usa la cuota pública de Google, más limitada). No tocar ninguna otra sección del README.
  - `CLAUDE.md`:
    - agregar `GOOGLE_BOOKS_API_KEY` (opcional) a las variables de entorno;
    - agregar `lookup/` a la estructura de `api/src`;
    - agregar el link al spec y al plan nuevos;
    - aclarar en `app.ts` que recibe "la db y el buscador".

- [ ] **Step 5: Commit.**
```bash
git add tp-final/api/src tp-final/api/test tp-final/README.md tp-final/CLAUDE.md
git commit -m "TP final: ruta GET /api/lookup con buscador inyectable"
```

### Task 3: `LookupApi` y componente `book-lookup`

**Files:**
- Modify: `web/src/app/book.model.ts` (agregar `BookCandidate`)
- Create:
  - `web/src/app/lookup.api.ts`;
  - `web/src/app/book-lookup/book-lookup.ts`;
  - `web/src/app/book-lookup/book-lookup.scss`.
- Test:
  - `web/src/app/lookup.api.spec.ts`;
  - `web/src/app/book-lookup/book-lookup.spec.ts`.

**Interfaces:**
- Consumes: `toUiError` de `api-error.ts`.
- Produces:
  - `interface BookCandidate`, con la misma forma que en la API, en `book.model.ts`;
  - `LookupApi.search(q: string): Observable<BookCandidate[]>` (`providedIn: 'root'`), que hace `GET /api/lookup` con `HttpParams` `q`;
  - `BookLookupComponent`, con selector `app-book-lookup` y `readonly picked = output<BookCandidate>()`. No tiene inputs.

- [ ] **Step 1: Tests que fallan.**
  - **`lookup.api.spec.ts`:** `search('rayuela cortázar')` pide `GET` con `r.url === '/api/lookup'` y `params.get('q') === 'rayuela cortázar'`.
  - **`book-lookup.spec.ts`:**
    - **Setup:** `provideHttpClient()`, `provideHttpClientTesting()` y `HttpTestingController`.
    - **Selectores:** el input se busca por label (`#lookup-q` con `<label for="lookup-q">Buscar en Google Books</label>`), el botón por texto `Buscar` y los resultados como `button.candidate`.
    - **Tests:**
      - `el botón está deshabilitado con el input vacío o con solo espacios`;
      - `buscar con el botón pide /api/lookup?q= con el texto recortado y muestra Buscando…`;
      - `Enter en el input busca`: hacer `dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))` y esperar un request;
      - `el botón está deshabilitado mientras carga`;
      - `renderiza un botón por candidato`: con pages, el texto es `Rayuela — Julio Cortázar · 736 págs.`; con `pages: null`, es `Rayuela — Julio Cortázar` y no contiene `págs.`;
      - `sin resultados muestra No se encontraron libros.`;
      - `un 502 muestra el mensaje de Google`: `flush({error:{code:'UPSTREAM_ERROR',message:'x'}}, {status:502, statusText:'Bad Gateway'})` → el texto exacto de error de Google de Global Constraints, en un elemento `role="alert"`;
      - `offline (status 0) muestra Sin conexión con el servidor`: usar `req.error(new ProgressEvent('error'))`;
      - `click en un resultado emite picked con ese candidato, colapsa la lista y muestra el aviso`. Para escuchar el output, suscribirse a `fixture.componentInstance.picked`;
      - `una búsqueda nueva cancela la anterior`: buscar `a` y luego `b`. El request de `a` queda `cancelled`; se hace flush de `b` y se ven sus resultados (Review Focus 3);
      - `buscar de nuevo después de elegir oculta el aviso y muestra los resultados nuevos` (Review Focus 5).

  Correr `npx ng test --watch=false`. Esperado: FAIL, porque los archivos no existen.

- [ ] **Step 2: Implementar.**
  - **`lookup.api.ts`:** seguir el patrón de `books.api.ts`.
  - **`book-lookup.ts`:**
    - signal `query`;
    - signal `state` con el tipo `{ kind: 'idle' } | { kind: 'loading' } | { kind: 'results'; items: BookCandidate[] } | { kind: 'error'; message: string } | { kind: 'picked' }`. "Vacío" es `results` con `items.length === 0`;
    - un `Subject<string>` con `switchMap` hacia `LookupApi.search`, con `catchError` adentro para que el stream siga vivo, y `takeUntilDestroyed`.
  - **Mensajes de error:** con `toUiError`, `offline` → `Sin conexión con el servidor`; cualquier otro error → el mensaje de Google (ver Ruling).
  - **Disparo:** `(keydown.enter)` en el input y `(click)` en el botón. No usar `<form>`, para no anidar ni disparar el submit del formulario de alta.
  - **Estilos:** seguir los de `book-form.scss`.
  - **Ruling:** cualquier error que no sea offline (502, 400, 500) muestra el mensaje de Google. La UI nunca manda un `q` inválido, así que el único error esperable es el 502.

- [ ] **Step 3: Verificar.** Correr `npx ng test --watch=false`. Esperado: todo PASS.

- [ ] **Step 4: Commit.**
```bash
git add tp-final/web/src/app/book.model.ts tp-final/web/src/app/lookup.api.ts tp-final/web/src/app/lookup.api.spec.ts tp-final/web/src/app/book-lookup
git commit -m "TP final: LookupApi y componente de búsqueda en Google Books"
```

### Task 4: `prefill` en `book-form`

**Files:**
- Modify: `web/src/app/book-form/book-form.ts`
- Test: `web/src/app/book-form/book-form.spec.ts`. Agregar el signal `prefill` al `HostComponent` y el binding `[prefill]="prefill()"`.

**Interfaces:**
- Consumes: `BookCandidate` de Task 3.
- Produces: `readonly prefill = input<BookCandidate | null>(null)` en `BookFormComponent`.

- [ ] **Step 1: Tests que fallan** (en `book-form.spec.ts`):
  - `un prefill completa los cinco campos y no toca el estado`: primero se elige `Leyendo` en el selector de estado y se tipea un título; después `prefill.set(CANDIDATE)`. Los 5 inputs muestran los valores del candidato, el título tipeado quedó pisado y el estado sigue en `reading`. Al enviar, `saved[0]` es `toEqual({ ...CANDIDATE, status: 'reading' })`.
  - `un prefill con nulls vacía los opcionales`: con ISBN y descripción tipeados, un candidato con `isbn: null, pages: null, description: null` → los inputs quedan vacíos y el submit manda los tres como `null`.
  - `en edición, prefill no tiene efecto`: con `book.set(BOOK)` y `prefill.set(CANDIDATE)`, los campos siguen mostrando `BOOK`.

  Correr `npx ng test --watch=false`. Esperado: FAIL.

- [ ] **Step 2: Implementar.** Agregar un segundo `effect` que lea `prefill()`. Si no es `null` y `book()` es `null`, hace `form.patchValue({ title, author, isbn: isbn ?? '', pages, description: description ?? '' })`. No toca `status`.

- [ ] **Step 3: Verificar.** Correr `npx ng test --watch=false`. Esperado: todo PASS.

- [ ] **Step 4: Commit.**
```bash
git add tp-final/web/src/app/book-form
git commit -m "TP final: precarga del formulario de alta desde un candidato"
```

### Task 5: Integración en `book-list`, flujo completo y docs del front

**Files:**
- Modify:
  - `web/src/app/book-list/book-list.ts`;
  - `CLAUDE.md`: la regla de HTTP del front y la estructura de `web/`.
- Test: `web/src/app/book-list/book-list.spec.ts`

**Interfaces:**
- Consumes:
  - `BookLookupComponent` (`picked`) de Task 3;
  - `BookFormComponent.prefill` de Task 4.
- Produces: `readonly prefill = signal<BookCandidate | null>(null)` en `BookListComponent`.

- [ ] **Step 1: Tests que fallan** (en `book-list.spec.ts`, con el `setup()` existente):
  - `flujo completo: Agregar → buscar → elegir → guardar`:
    - se hace flush de la lista inicial;
    - se hace click en `+ Agregar`;
    - se escribe `rayuela` en `#lookup-q` y se hace click en `Buscar`;
    - se hace `expectOne('/api/lookup?q=rayuela')` con flush de `[CANDIDATE]`;
    - se hace click en `button.candidate` y luego en `Agregar libro`;
    - el `POST /api/books` tiene un body `toEqual({ title, author, isbn, pages, description, status: 'to-read' })` con los valores del candidato;
    - se hace flush del libro creado y el modal se cierra.
  - `en edición no aparece el buscador`: después de abrir la edición de una card, `app-book-lookup` no existe; al abrir `+ Agregar`, sí existe.
  - `cerrar el modal limpia la precarga` (Review Focus 4): se elige un candidato, se hace click en `Cancelar` y luego en `+ Agregar`. El título está vacío, no hay `button.candidate` y no aparece el aviso de datos cargados.

  Correr `npx ng test --watch=false`. Esperado: FAIL.

- [ ] **Step 2: Implementar.**
  - Dentro del `@if (editing() !== undefined)` existente y arriba de `<app-book-form>`, agregar `@if (editing() === null) { <app-book-lookup (picked)="prefill.set($event)" /> }`.
  - Pasar `[prefill]="prefill()"` al formulario.
  - Poner `prefill` en `null` en `closeModal()` y en `openCreate()`.

- [ ] **Step 3: Docs.** En `CLAUDE.md`:
  - "En el front solo `books.api.ts` hace HTTP." pasa a ser "En el front solo los archivos `*.api.ts` hacen HTTP.";
  - en la estructura de `web/`, agregar `lookup.api.ts` y `book-lookup/`, y cambiar la descripción de `books.api.ts` para que ya no diga "único punto".

- [ ] **Step 4: Verificar.**
  - En `web/`: `npx ng test --watch=false` y `npx ng build`. Esperado: todo PASS y el build OK.
  - En `api/`: `npm test`. Esperado: PASS.

- [ ] **Step 5: Commit.**
```bash
git add tp-final/web/src/app/book-list tp-final/CLAUDE.md
git commit -m "TP final: buscador de Google Books en el modal de alta"
```
