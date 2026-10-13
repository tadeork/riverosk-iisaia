# Scriptorium — Búsqueda en Google Books (diseño)

Fecha: 2026-10-12
Estado: aprobado en brainstorming, pendiente de revisión del spec escrito
Ciclo anterior: `2026-10-07-scriptorium-core-design.md` (núcleo, ya mergeado)

## Objetivo

Ahorrar tipeo al dar de alta un libro. Desde el modal de "+ Agregar", el usuario busca en Google Books, elige un resultado y el formulario se precarga. Puede corregir los datos antes de guardar. La búsqueda pasa por la API propia, que funciona como proxy.

### Criterios de éxito

- Desde "+ Agregar" se busca "rayuela cortazar", se toca un resultado y el formulario queda con título, autor, ISBN, páginas y descripción. Al guardar, el `POST /api/books` lleva esos datos.
- Cargar un libro a mano sigue funcionando exactamente igual.
- Si Google falla o no responde, la UI muestra un error claro en el buscador y el formulario sigue usable.
- La API key de Google nunca llega al cliente ni aparece en respuestas o logs.
- Los tests de la API no tocan la red real.
- `api/openapi.yaml` documenta el endpoint nuevo antes de que exista el código.

## Decisiones

| Tema | Decisión | Alternativas descartadas |
|---|---|---|
| Propósito | Precargar el formulario de alta | Guardar también portadas; vista de exploración con alta en un click |
| Fuente | Solo Google Books | Google con fallback a OpenLibrary (como el original); solo OpenLibrary |
| Dónde corre la búsqueda | Proxy en la API (`GET /api/lookup`) | El front llama directo a Google (expone la key y le quita el rol al backend) |
| Diseño del proxy | Adaptador inyectable en `createApp`, sin caché | Mismo enfoque con caché en memoria (YAGNI para un solo usuario) |
| Ubicación en la UI | Buscador arriba del formulario, solo en el alta | Paso previo dentro del modal; botón aparte en la toolbar |
| Disparo de la búsqueda | Enter o botón "Buscar" | Mientras se tipea con debounce (gasta cuota) |
| API key | Opcional, en `GOOGLE_BOOKS_API_KEY` | Obligatoria |
| Modelo de datos | Sin cambios | Agregar `coverUrl` |

## Contrato de la API

Se agrega a `api/openapi.yaml` antes de implementar.

| método | ruta | éxito | errores |
|---|---|---|---|
| GET | `/lookup?q=` | 200 `BookCandidate[]` (como máximo 10) | 400 `q` inválido, 502 Google no disponible |

- `q`: obligatorio. Se recortan los espacios de los costados. Si después del recorte queda vacío o tiene más de 200 caracteres, la respuesta es 400 `BAD_REQUEST`.
- `BookCandidate`: `{ title: string, author: string, isbn: string | null, pages: integer | null, description: string | null }`. Usa los mismos tipos que los campos homónimos de `Book`. Los opcionales van como `null` y nunca se omiten.
- Al enum `code` del schema `Error` se agrega `UPSTREAM_ERROR` (502). El mensaje es genérico: no incluye la URL de Google, la key ni el cuerpo de la respuesta de Google.
- Cero resultados no es un error: la respuesta es 200 `[]`.

## Normalización (Google Books → `BookCandidate`)

Request: `GET https://www.googleapis.com/books/v1/volumes` con los parámetros `q`, `maxResults=10` y `printType=books`. Se agrega `key` solo si hay key configurada. Los parámetros se arman con `URLSearchParams`.

Por cada `items[i].volumeInfo`:

| campo | regla |
|---|---|
| `title` | `title`; si hay `subtitle`, `"title: subtitle"` |
| `author` | `authors` unidos con `", "` |
| `isbn` | el `identifier` de tipo `ISBN_13`; si no hay, el de `ISBN_10`; si no hay ninguno, `null` |
| `pages` | `pageCount` si es un entero > 0; si no, `null` |
| `description` | `description` tal cual; si falta, `null` |

- Se descartan los ítems sin `title` o sin `authors`, porque el formulario los exige.
- Si la respuesta no trae `items`, que es lo que hace Google cuando no hay resultados, el resultado es `[]`.

## Estructura

```
api/src/
├── lookup/
│   ├── google-books.ts    createGoogleBooksSearch({ apiKey?, fetch?, timeoutMs? }): BookSearch
│   └── lookup.routes.ts   valida q (zod) y llama a search(q); sin reglas de negocio
├── app.ts                 createApp(db, { search }) — monta /api/lookup antes del 404
└── server.ts              crea el buscador con GOOGLE_BOOKS_API_KEY
web/src/app/
├── lookup.api.ts          LookupApi.search(q): Observable<BookCandidate[]>
├── book.model.ts          + BookCandidate
├── book-lookup/           buscador: input, botón, estados, lista de resultados; output picked
├── book-form/             + input prefill
└── book-list/             muestra book-lookup en el modal solo en alta; signal prefill
```

- `type BookSearch = (q: string) => Promise<BookCandidate[]>`. `createApp` lo recibe como dependencia, igual que recibe la db. Así los tests pasan un buscador falso.
- `google-books.ts` usa el `fetch` global por defecto, con un timeout de 5000 ms vía `AbortSignal.timeout`. Si la respuesta no es 2xx, si se agota el timeout o si hay un error de red o de JSON, lanza `HttpError(502, 'UPSTREAM_ERROR', 'No se pudo consultar Google Books')`.
- La regla de `CLAUDE.md` "en el front solo `books.api.ts` hace HTTP" pasa a ser "solo los archivos `*.api.ts` hacen HTTP".

## Flujo en la UI

- `book-list` muestra `<app-book-lookup>` arriba de `<app-book-form>` solo cuando `editing() === null` (alta). Tiene un signal `prefill: BookCandidate | null`, que se pone en `null` al cerrar el modal.
- `book-lookup`:
  - input con label "Buscar en Google Books" y `maxlength="200"`, más un botón "Buscar". El botón se deshabilita si el input está vacío (después de recortar espacios) o mientras carga;
  - busca con Enter o con el botón. Las búsquedas pasan por un `switchMap`, así una nueva cancela la anterior;
  - estados:
    - idle: no muestra nada;
    - cargando: "Buscando…";
    - resultados: una lista de botones con "Título — Autor", más "· N págs." si hay páginas;
    - vacío: "No se encontraron libros.";
    - error: un mensaje en línea dentro del buscador.
  - al tocar un resultado emite `picked` con ese candidato. La lista se colapsa y aparece "Datos cargados desde Google Books: revisalos antes de guardar.".
- `book-form` recibe `prefill = input<BookCandidate | null>(null)`. Cuando cambia a un valor no nulo y el formulario está en alta, hace `patchValue` de título, autor, ISBN, páginas y descripción. Pisa los cinco campos, y los `null` quedan vacíos. No toca `status`.

## Manejo de errores

| situación | API | UI (en el buscador) |
|---|---|---|
| `q` vacío o de más de 200 caracteres | 400 `BAD_REQUEST` | no ocurre: botón deshabilitado y `maxlength` |
| Google responde no-2xx, tarda más de 5 s o no hay red del lado del server | 502 `UPSTREAM_ERROR` | "No se pudo consultar Google Books. Probá de nuevo o cargalo a mano." |
| La API está caída (status 0) | — | "Sin conexión con el servidor" |
| Sin resultados | 200 `[]` | "No se encontraron libros." |

En todos los casos el formulario de abajo sigue usable. Los errores del buscador no van al banner de la lista, porque el modal lo taparía.

## Testing

TDD, como en el núcleo.

- **API:**
  - `google-books.test.ts`, con un `fetch` falso y fixtures JSON con la forma real de la respuesta de Google:
    - normalización, cubriendo subtítulo, varios autores, ISBN-13 contra ISBN-10, `pageCount` ausente o en 0, y descripción ausente;
    - se descartan los ítems sin título o sin autores;
    - sin `items` → `[]`;
    - la key se agrega solo si existe, y `q` va codificado;
    - un no-2xx, un timeout o un JSON inválido → `HttpError` 502.
  - `lookup.test.ts`, vía supertest con un `search` falso:
    - 200 con los candidatos;
    - `q` ausente, vacío, de solo espacios o de 201 caracteres → 400;
    - un 502 se propaga con la forma de error uniforme, y el body no contiene `googleapis`.
- **Web:**
  - `lookup.api.spec.ts`: URL y param `q`.
  - `book-lookup.spec.ts`:
    - busca con Enter y con el botón;
    - el botón está deshabilitado con el input vacío;
    - estados de cargando, vacío, error 502 y offline;
    - click en un resultado → `picked`.
  - `book-form.spec.ts`: un prefill completa los cinco campos; un prefill con nulls vacía los opcionales; el status no cambia.
  - `book-list.spec.ts`:
    - flujo completo: Agregar → buscar → elegir → guardar → el body del POST lleva los datos del candidato;
    - en edición no aparece el buscador.

## Configuración

- `GOOGLE_BOOKS_API_KEY` es opcional. Sin ella, la búsqueda usa la cuota pública de Google, que es más limitada. Se documenta en la sección "Cómo se ejecuta" del README.

## Fuera de alcance

Portadas, OpenLibrary, caché, búsqueda desde la edición, paginación más allá de 10 resultados, alta en un click sin pasar por el formulario, tests E2E contra Google real.
