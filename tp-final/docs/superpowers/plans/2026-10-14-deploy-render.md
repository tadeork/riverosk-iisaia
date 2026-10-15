# Deploy en Render — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scriptorium en una URL de Render: un solo servicio donde Express sirve la API y el build de Angular.

**Architecture:** `createApp` recibe un `webDir` opcional; si está, sirve los estáticos y hace fallback a `index.html` para las rutas que no son `/api`. El servicio se crea con el CLI de Render, con la key tomada del entorno del usuario.

**Tech Stack:** Express 5, supertest + vitest, Angular 22, Render CLI 2.28.

**Spec:** `tp-final/docs/superpowers/specs/2026-10-14-deploy-render-design.md`

## Global Constraints

- `GOOGLE_BOOKS_API_KEY` no se imprime, no se escribe en archivos y no se commitea. Solo viaja en `--env-var` expandida por el shell.
- No se toca `api/data/scriptorium.db`. Las pruebas locales usan `DB_PATH` en el scratchpad.
- `openapi.yaml` no cambia.
- Push, PRs, merges y creación del servicio en Render se confirman con el usuario antes.
- Commits `TP final: ...`, sin atribución.

## Review Focus

- `GET /api/nada` con `webDir`: tiene que seguir siendo 404 JSON, no `index.html` (test en Task 1).
- Un `POST` a una ruta del front no debe devolver `index.html` (el fallback es solo `GET`; test en Task 1).
- El build en Render necesita las devDependencies (`tsx`, `@angular/build`): si Render instalara con `NODE_ENV=production`, fallaría. Se verifica en el log del primer deploy.
- `NODE_VERSION=24`: Angular 22 exige Node 22.22+ o 24.15+.

---

### Task 1: la API sirve el front

**Files:**
- Modify: `tp-final/api/src/app.ts`, `tp-final/api/src/server.ts`
- Create: `tp-final/api/test/web.test.ts`

**Interfaces:**
- Produces: `createApp(db, deps: { search: BookSearch; webDir?: string })`; variable de entorno `WEB_DIR`.

- [ ] **Step 1: tests que fallan** en `web.test.ts`. En `beforeAll`, `mkdtempSync(join(tmpdir(), 'scriptorium-web-'))` con `index.html` (`<h1>Scriptorium</h1>`) y `app.js` (`console.log(1)`). App con `createApp(openDb(':memory:'), { search: async () => [], webDir })`:
  - `GET / devuelve index.html` → 200, `text/html`, contiene `Scriptorium`.
  - `GET /app.js devuelve el archivo` → 200, contiene `console.log(1)`.
  - `GET /libro/123 devuelve index.html` → 200, contiene `Scriptorium`.
  - `GET /api/nada sigue siendo 404 JSON` → 404, `body.error.code === 'NOT_FOUND'` (misma forma que los tests existentes).
  - `POST /libro/123 no devuelve index.html` → 404.
  - `sin webDir, GET / da 404` → con `makeApp()`.
- [ ] **Step 2:** `npm test` en `api/` → fallan los nuevos.
- [ ] **Step 3: implementar.** En `createApp`, después del handler 404 de `/api` y antes de `errorHandler`: si `deps.webDir`, `app.use(express.static(deps.webDir))` y `app.get('/{*path}', (_req, res) => res.sendFile(join(deps.webDir!, 'index.html')))`. `server.ts`: `webDir: process.env.WEB_DIR || undefined`.
- [ ] **Step 4:** `npm test` y `npx tsc --noEmit` en `api/` → verde y limpio.
- [ ] **Step 5: prueba local de producción.** `npx ng build` en `web/`; en `api/`, `PORT=3100 DB_PATH=<scratchpad>/deploy-test.db WEB_DIR=../web/dist/web/browser npm start` en segundo plano; `curl` a `/`, `/libro/1`, `/api/books` y `/api/nada`. Esperado: HTML, HTML, `[]` y 404 JSON. Bajar el servidor.
- [ ] **Step 6:** Commit `TP final: la API sirve el build de Angular si hay WEB_DIR`.

### Task 2: documentación

**Files:**
- Modify: `tp-final/README.md` (sección "Deploy" con la URL, los límites y el comando), `tp-final/CLAUDE.md` (variable `WEB_DIR`, spec y plan)

- [ ] **Step 1:** Escribir las dos secciones. La URL se completa en Task 3, cuando exista; hasta entonces no se escribe ninguna.
- [ ] **Step 2:** Commit `TP final: deploy en Render documentado`.

### Task 3: PRs, merge y servicio (con confirmación del usuario)

- [ ] **Step 1:** Push de `feature/escaneo-tapa` y `feature/deploy-render`; PR de cada una a `main` (bodies con `--body-file`). Merge en orden: escaneo, después deploy.
- [ ] **Step 2:** `render services create` con los valores de la tabla del spec, `--output json`. Anotar el ID y la URL del servicio.
- [ ] **Step 3:** Seguir el primer deploy con `render deploys list` / `render logs` hasta `live`. Si falla, leer el log antes de tocar nada.
- [ ] **Step 4:** `curl` a `https://<url>/` y `https://<url>/api/books`. Esperado: HTML y `[]`. Prueba en el navegador del usuario.
- [ ] **Step 5:** Completar la URL en el README, commit `TP final: URL del deploy en el informe`, PR y merge (con confirmación).
