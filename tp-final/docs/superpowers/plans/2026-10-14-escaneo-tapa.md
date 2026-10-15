# Escaneo de la tapa con la cámara — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En "Agregar libro", un botón abre la cámara y el texto que Tesseract.js lee de la tapa, en vivo, va reemplazando la consulta del buscador de Google Books.

**Architecture:** Dos servicios finos sobre el navegador (`Camera` para `getUserMedia`, `CoverOcr` para canvas + Tesseract) y un componente `CoverScannerComponent` que los usa con un intervalo de 1 s. `BookLookupComponent` lo muestra y copia el texto a la consulta. Todo pasa en el front; la API no cambia.

**Tech Stack:** Angular 22 (standalone, signals, zoneless), vitest + jsdom, `tesseract.js`.

**Spec:** `tp-final/docs/superpowers/specs/2026-10-14-escaneo-tapa-design.md`

## Global Constraints

- Todo el trabajo es en `tp-final/web/`. No se tocan `api/` ni `openapi.yaml`.
- Solo `*.api.ts` hacen HTTP; estos servicios no hacen HTTP propio (Tesseract descarga sus modelos solo).
- Textos exactos: botón `Escanear tapa` / `Cerrar cámara`; errores `No se pudo abrir la cámara. Revisá el permiso del navegador o buscá a mano.` y `No se pudo leer la tapa.`
- Intervalo de lectura: 1000 ms. Recuadro guía: 80 % del ancho y 40 % del alto, centrado.
- Tesseract se importa con `import('tesseract.js')`, nunca estático. Idioma `spa`.
- TDD: cada test se ve fallar antes de escribir el código. Commits `TP final: ...`, sin atribución.

## Review Focus

- Cerrar el modal con la cámara abierta: el scanner se destruye y las pistas se apagan (test en Task 2, "al destruirse…").
- Una lectura lenta (más de 1 s): no se apilan lecturas (test en Task 2).
- Texto del OCR con saltos de línea o solo espacios: se limpia o se ignora (tests en Task 3).
- Una lectura que termina después de destruir el scanner no debe emitir (test en Task 2).
- `video.play()` no existe en jsdom: el `<video>` usa `autoplay muted playsinline` y no se llama a `play()`.

---

### Task 1: dependencia y servicios `Camera` y `CoverOcr`

**Files:**
- Modify: `tp-final/web/package.json`, `package-lock.json` (con `npm install tesseract.js`)
- Create: `tp-final/web/src/app/camera.ts`, `tp-final/web/src/app/cover-ocr.ts`

**Interfaces:**
- Produces: `Camera` (`@Injectable({ providedIn: 'root' })`) con `open(): Promise<MediaStream>`; `CoverOcr` (root) con `read(video: HTMLVideoElement): Promise<string>`.

- [ ] **Step 1:** `npm install tesseract.js` en `tp-final/web` (confirmado por el usuario).
- [ ] **Step 2:** `Camera.open()` llama a `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })`.
- [ ] **Step 3:** `CoverOcr.read(video)`: canvas con la zona central (80 % × 40 % de `videoWidth`/`videoHeight`), `drawImage` del recorte, y `worker.recognize(canvas)` → `data.text`. El worker sale de `createWorker('spa')` vía `import('tesseract.js')`, se guarda como promesa en el servicio y se reutiliza. Si el video todavía no tiene tamaño (`videoWidth === 0`), devuelve `''`.
- [ ] **Step 4:** `npx tsc -p tsconfig.app.json --noEmit` y `npx ng build`. Esperado: sin errores. Si el build avisa por dependencia CommonJS de `tesseract.js`, agregarla a `allowedCommonJsDependencies` en `angular.json`.
- [ ] **Step 5:** Commit `TP final: tesseract.js y servicios de cámara y OCR`.

### Task 2: `CoverScannerComponent`

**Files:**
- Create: `tp-final/web/src/app/cover-scanner/cover-scanner.ts`, `cover-scanner.scss`, `cover-scanner.spec.ts`

**Interfaces:**
- Consumes: `Camera.open()`, `CoverOcr.read(video)` de Task 1.
- Produces: selector `app-cover-scanner`, `readonly text = output<string>()`. Sin inputs.

- [ ] **Step 1: tests que fallan.** En `cover-scanner.spec.ts`, con `vi.useFakeTimers()`, un `Camera` falso (`open` devuelve un stream con `getTracks: () => [track]`, `track.stop = vi.fn()`) y un `CoverOcr` falso (`read = vi.fn()`), suscripción a `text`:
  - `pide la cámara y asigna el stream al video` → `open` llamado una vez; `video.srcObject === stream`.
  - `cada segundo emite el texto leído` → `read` resuelve `'RAYUELA'`; tras `advanceTimersByTimeAsync(1000)` se emitió `'RAYUELA'`; tras otros 1000, dos emisiones.
  - `no lanza una lectura nueva mientras la anterior sigue en curso` → `read` devuelve una promesa que no resuelve; tras 3000 ms, `read` llamado una vez.
  - `al destruirse apaga las pistas y no lee más` → `fixture.destroy()`; `track.stop` llamado; tras 2000 ms, sin lecturas nuevas.
  - `una lectura que termina después de destruirse no emite` → `read` pendiente, destroy, resolver; sin emisiones.
  - `si la cámara falla muestra el error` → `open` rechaza; `[role="alert"]` con el texto de cámara; no hay lecturas.
  - `si una lectura falla muestra el error y sigue leyendo` → primera lectura rechaza, segunda resuelve `'X'`; tras la primera se ve `No se pudo leer la tapa.`; tras la segunda se emitió `'X'` y el error ya no está.
- [ ] **Step 2:** `npx ng test --watch=false` → los tests nuevos fallan (no existe el componente).
- [ ] **Step 3: implementar.** Template: `<div class="frame"><video #video autoplay muted playsinline></video><div class="guide"></div></div>` y el error con `role="alert"`. En el constructor, `afterNextRender` abre la cámara; con el stream, lo asigna al video y arranca `setInterval(tick, 1000)`. `tick` no hace nada si hay una lectura en curso o si ya se destruyó. `DestroyRef.onDestroy`: marca destruido, `clearInterval`, `stream.getTracks().forEach(t => t.stop())`. Estilos: `.guide` absoluto, centrado, 80 % × 40 %, borde `3px dashed #fbc02d`; el video a lo ancho.
- [ ] **Step 4:** `npx ng test --watch=false` → todo verde.
- [ ] **Step 5:** Commit `TP final: componente que lee la tapa desde la cámara`.

### Task 3: botón en el buscador

**Files:**
- Modify: `tp-final/web/src/app/book-lookup/book-lookup.ts`, `book-lookup.scss`, `book-lookup.spec.ts`

**Interfaces:**
- Consumes: `CoverScannerComponent` (`app-cover-scanner`, output `text`) de Task 2.

- [ ] **Step 1: tests que fallan** en `book-lookup.spec.ts`. El `setup` provee `Camera` y `CoverOcr` falsos que no resuelven (así el scanner no hace nada). Para emitir, `fixture.debugElement.query(By.directive(CoverScannerComponent)).componentInstance.text.emit(...)`:
  - `Escanear tapa muestra el scanner y Cerrar cámara lo saca`.
  - `el texto del scanner, limpio, reemplaza la consulta` → emitir `'  Rayuela\n\nJulio   Cortázar '` → `input.value === 'Rayuela Julio Cortázar'`.
  - `el texto se corta en 200 caracteres` → emitir `'a'.repeat(250)` → largo 200.
  - `el texto vacío o de solo espacios no cambia la consulta` → con `'rayuela'` tipeado, emitir `' \n '` → sigue `'rayuela'`.
  - `Buscar cierra la cámara` → con el scanner abierto y texto, click en Buscar → no hay `app-cover-scanner` (y se responde el request de lookup para `verify()`).
- [ ] **Step 2:** `npx ng test --watch=false` → fallan los nuevos.
- [ ] **Step 3: implementar.** Signal `scanning = signal(false)`. Botón `type="button" class="scan"` con el texto según `scanning()`, en la `.row` después de **Buscar**. `@if (scanning()) { <app-cover-scanner (text)="onScanned($event)" /> }` debajo de la fila. `onScanned(raw)`: `raw.replace(/\s+/g, ' ').trim().slice(0, 200)`; si no queda vacío, `query.set`. `search()` pone `scanning` en `false` antes de buscar. Estilo `.scan` con fondo `#fff`.
- [ ] **Step 4:** `npx ng test --watch=false` → todo verde.
- [ ] **Step 5:** Commit `TP final: botón Escanear tapa en el alta`.

### Task 4: verificación y documentación

**Files:**
- Modify: `tp-final/CLAUDE.md` (spec, plan y estructura), `tp-final/README.md` (funcionalidad y decisión)

- [ ] **Step 1:** `npx ng test --watch=false` y `npx ng build` en `tp-final/web`. Anotar la salida real (cantidad de tests y tamaño del bundle inicial).
- [ ] **Step 2: prueba a mano** con `npm run dev` en `api/` y `npx ng serve` en `web/`: abrir "Agregar libro", **Escanear tapa**, aceptar el permiso, apuntar un libro, ver el texto en el campo, **Buscar**, elegir candidato, guardar. Verificar que la luz de la cámara se apaga con **Cerrar cámara**, con **Buscar** y al cerrar el modal. Probar también negando el permiso. Lo hace el usuario con su webcam; se anota lo que vio, sin inventar resultados.
- [ ] **Step 3:** En `tp-final/CLAUDE.md`, sumar el spec y el plan a la lista y `camera.ts`, `cover-ocr.ts` y `cover-scanner/` a la estructura. En `tp-final/README.md`, una línea en la funcionalidad y una decisión ("OCR en el navegador con Tesseract.js, no entrenar uno propio").
- [ ] **Step 4:** Commit `TP final: escaneo de la tapa documentado`.
