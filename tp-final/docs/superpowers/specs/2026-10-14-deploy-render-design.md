# Scriptorium — Deploy en Render (diseño)

Fecha: 2026-10-14
Estado: el usuario eligió en el chat el plan gratis y la opción "deployar tal cual, con SQLite"; descartó localStorage porque la consigna pide persistencia en el servidor. El usuario aprobó este spec y el plan antes de implementar.
Ciclo anterior: `2026-10-14-escaneo-tapa-design.md`. Este ciclo sale de su branch, porque la cámara necesita HTTPS y el deploy lo da.

## Objetivo

Scriptorium en una URL pública con HTTPS, para la demo, sin cambiar cómo se guardan los datos.

### Criterios de éxito

- La URL de Render abre la app, y agregar, editar, buscar en Google Books y escanear la tapa funcionan como en local.
- Recargar el navegador en cualquier ruta devuelve la app, no un 404.
- Las rutas `/api/...` inexistentes siguen devolviendo el error JSON del contrato.
- `GOOGLE_BOOKS_API_KEY` está en las variables de entorno de Render y no aparece en el repo, en la salida de comandos ni en archivos.
- En local nada cambia: `npm run dev` + `ng serve` funcionan igual.

## Decisiones

| Tema | Decisión | Alternativas descartadas |
|---|---|---|
| Persistencia | SQLite como está, en el disco efímero del plan gratis | localStorage (no cumple la consigna); disco persistente (pago); Postgres gratis (vence a los 30 días y obliga a reescribir el repo de datos) |
| Servicios | Uno: Express sirve la API y el build de Angular | Static Site + Web Service (CORS o reenvío de `/api`, dos URLs) |
| Cómo se crea | `render services create` con el CLI, que ya tiene la sesión del usuario | Blueprint (`render.yaml`) desde el panel, con el usuario pegando la key a mano |
| La key | `--env-var GOOGLE_BOOKS_API_KEY=$GOOGLE_BOOKS_API_KEY`, expandida por el shell desde el entorno del usuario | Escribirla en un archivo o en `render.yaml` |
| Datos de ejemplo | No se agregan: la app arranca vacía tras cada reinicio | Carga inicial al arrancar (queda para otro ciclo si hace falta) |

## Diseño

### API

- `createApp(db, deps)` suma `deps.webDir?: string`. Si viene:
  - `express.static(webDir)` sirve los archivos del build;
  - cualquier `GET` que no sea de `/api` y no sea un archivo devuelve `webDir/index.html`, para que Angular resuelva la ruta.
- El orden queda: rutas de `/api`, 404 JSON de `/api`, estáticos, fallback a `index.html`, `errorHandler`. Así `/api/...` nunca cae en el `index.html`.
- `server.ts` pasa `process.env.WEB_DIR` cuando está definida. Sin ella (desarrollo local), la API se comporta igual que hoy.
- No cambia `openapi.yaml`: el contrato es `/api`, y servir el front no es parte de él.

### Servicio en Render

| Campo | Valor |
|---|---|
| Nombre | `scriptorium` |
| Tipo, runtime y plan | `web_service`, `node`, `free` |
| Repo y branch | `https://github.com/tadeork/riverosk-iisaia`, `main` |
| Root directory | `tp-final` |
| Build | `cd api && npm ci --include=dev && cd ../web && npm ci --include=dev && npx ng build` (las devDependencies hacen falta para `tsx` y `@angular/build`) |
| Start | `cd api && npm start` |
| Health check | `/api/books` |
| Variables | `NODE_VERSION=24`, `WEB_DIR=../web/dist/web/browser`, `GOOGLE_BOOKS_API_KEY` (desde el entorno) |

- `PORT` lo pone Render; la API ya lo lee.
- `DB_PATH` queda en su default (`data/scriptorium.db`), y `openDb` crea la carpeta.
- Render deploya desde `main`: las branches del escaneo y del deploy se mergean por PR antes de crear el servicio.

### Límites conocidos (van al README)

- Los datos se borran cuando Render redeploya, reinicia o apaga el servicio, lo que pasa después de 15 minutos sin tráfico.
- La primera visita después de que se apaga tarda alrededor de un minuto.

## Testing

- `api/test/web.test.ts`, con un directorio temporal que tiene un `index.html` y un `app.js`:
  - `GET /` devuelve el `index.html`;
  - `GET /app.js` devuelve el archivo;
  - `GET /libro/123` (una ruta del front) devuelve el `index.html`;
  - `GET /api/nada` sigue siendo 404 JSON `NOT_FOUND`;
  - sin `webDir`, `GET /` da 404 y no sirve ningún archivo.
- Prueba local del build de producción: `ng build` y la API con `WEB_DIR` en otro puerto, con una base temporal (nunca `data/scriptorium.db`).
- Después del deploy: `curl` a `/` y a `/api/books` en la URL de Render, y prueba en el navegador. La cámara en el celular se prueba ahí.

## Fuera de alcance

- Disco persistente, Postgres o cualquier cambio de persistencia.
- Datos de ejemplo.
- Dominio propio.
- CI o deploy desde otra branch.
