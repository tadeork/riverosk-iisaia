# Scriptorium — Portadas (diseño)

Fecha: 2026-10-13
Estado: parte 1 (datos y API) aprobada en brainstorming; las partes 2 y 3 se escribieron directo en este spec a pedido del usuario. Falta la revisión del spec escrito.
Ciclos anteriores:
- `2026-10-07-scriptorium-core-design.md` (núcleo);
- `2026-10-12-google-books-lookup-design.md` (búsqueda en Google Books).

Los dos ya están mergeados.

## Objetivo

Cada libro puede tener una portada, que se ve en su card. La portada se precarga al elegir un resultado de Google Books y también se puede pegar o corregir a mano en el formulario. Esto sirve para los libros ya cargados y para los que Google no tiene. Solo se guarda la URL; la imagen la carga el navegador.

### Criterios de éxito

- Al agregar un libro desde un resultado de Google que tiene imagen, el formulario queda con la URL de portada. Al guardar, la card muestra la imagen.
- Un libro sin portada, o con una URL que ya no responde, muestra un placeholder prolijo y nunca el ícono de imagen rota.
- Se puede agregar, cambiar o quitar la portada de un libro existente desde "Editar".
- Los libros cargados antes de este ciclo siguen ahí después de actualizar, con `coverUrl: null`. La base existente se migra sola al arrancar la API.
- Una URL que no sea `http` ni `https` (`javascript:`, `data:`, texto suelto) se rechaza con 422 y un error en el campo.
- `api/openapi.yaml` documenta `coverUrl` antes de que exista el código.

## Decisiones

| Tema | Decisión | Alternativas descartadas |
|---|---|---|
| Origen de la portada | Google al elegir un resultado, más un campo de URL a mano | Solo Google (los libros manuales quedan sin portada); subir un archivo de imagen |
| Almacenamiento | Solo la URL (`coverUrl`) en SQLite; el navegador carga la imagen | Descargar la imagen y servirla desde la API; proxy de imágenes en la API |
| Migración | `ALTER TABLE … ADD COLUMN` idempotente en `openDb` | Sistema de migraciones versionado (YAGNI para una columna) |
| Imagen de Google | `thumbnail`, si no hay `smallThumbnail`, con `http://` pasado a `https://` | Pedir tamaños más grandes con `zoom` (no siempre existen) |
| Imagen rota | Placeholder en la card y en la vista previa | Dejar el ícono de imagen rota del navegador |
| Miniatura en resultados de Google | Sí: ayuda a distinguir ediciones repetidas | Solo texto, como en el ciclo 2 |

## Parte 1: datos y API (aprobada)

- **Base de datos:**
  - La tabla `books` suma `coverUrl TEXT`, que acepta nulos.
  - `openDb` lee `PRAGMA table_info(books)`; si falta `coverUrl`, corre `ALTER TABLE books ADD COLUMN coverUrl TEXT`.
  - Es idempotente: con una base nueva o ya migrada no hace nada. Las filas existentes quedan con `coverUrl = null`.
- **Modelo:**
  - `Book` suma `coverUrl: string | null`. Igual que `isbn`, `pages` y `description`, siempre viene en las respuestas y nunca se omite.
  - En POST y PATCH se puede mandar `null` para quitar la portada.
- **Validación (zod):**
  - `coverUrl` tiene que ser una URL con protocolo `http` o `https`, de 2000 caracteres como máximo, después de recortar espacios.
  - Cualquier otro valor da 422 `VALIDATION_ERROR` con `fields.coverUrl`.
  - `coverUrl` no participa en las reglas de negocio, así que `resolve()` no cambia, salvo por el default `coverUrl: null`.
- **Google:**
  - `BookCandidate` suma `coverUrl: string | null`.
  - Se toma `volumeInfo.imageLinks.thumbnail` y, si no está, `smallThumbnail`. Si no hay ninguna, va `null`.
  - Si la URL empieza con `http://`, se reemplaza por `https://`. El resto de la URL queda igual.
- **Contrato:** `openapi.yaml` suma `coverUrl` a `Book`, `BookInput`, `BookPatch` y `BookCandidate`. En `Book` y `BookCandidate` es `required` y acepta `null`. Lleva `format: uri` y `maxLength: 2000`.
- **Búsqueda y orden:** no cambian. `q` sigue buscando en título, autor e ISBN.

## Parte 2: interfaz

- **`book-card`:**
  - Muestra la portada a la izquierda del contenido, en un recuadro fijo de 80×120 px con `object-fit: cover` y borde de 2px en el color de la paleta.
  - El `<img>` lleva `alt="Portada de {título}"`, `loading="lazy"` y `referrerpolicy="no-referrer"`.
  - Si `coverUrl` es `null`, o si la imagen dispara `error`, se muestra un placeholder del mismo tamaño en lugar de la imagen: fondo `#f5f5f5` y la inicial del título en grande, con `aria-hidden="true"`.
  - Un signal `coverFailed` registra el error. Se vuelve a `false` cuando cambia `coverUrl`, para que una URL corregida se intente cargar.
  - En pantallas angostas (< 480 px), la portada va arriba del contenido.
- **`book-form`:**
  - Agrega un campo nuevo, "URL de portada" (`name="coverUrl"`, `type="url"`), después de "Descripción".
  - Si el campo tiene un valor, abajo se ve una vista previa de 80×120 px. Si la imagen falla, la vista previa se reemplaza por el texto "No se pudo cargar la imagen". Esto no bloquea el guardado, porque la URL puede ser válida aunque la imagen no cargue en ese momento.
  - Al enviar, se recortan los espacios y un valor vacío se manda como `null`.
  - Un 422 con `fields.coverUrl` se muestra debajo del campo, como en los demás campos.
  - En edición, el campo se carga con el `coverUrl` del libro.
- **Precarga desde Google:** `prefill` ahora completa también `coverUrl`, así que son seis campos. Sigue sin tocar el estado, y un `coverUrl: null` deja el campo vacío.
- **`book-lookup`:**
  - Cada resultado muestra a la izquierda una miniatura de 32×48 px, decorativa (`alt=""`), si el candidato tiene `coverUrl`. Si no tiene, va un hueco del mismo tamaño para que las filas queden alineadas.
  - El texto de la fila no cambia: "Título — Autor · N págs.".

## Parte 3: errores y tests

### Manejo de errores

| situación | API | UI |
|---|---|---|
| `coverUrl` con otro protocolo, texto suelto o más de 2000 caracteres | 422 con `fields.coverUrl` | error debajo del campo |
| `coverUrl: null` o campo vacío | se guarda `null` | placeholder en la card |
| La URL es válida pero la imagen no carga | — | card: placeholder; formulario: "No se pudo cargar la imagen" |
| Google no trae `imageLinks` | `coverUrl: null` en el candidato | hueco en la fila, sin miniatura |

### Testing

TDD, como en los ciclos anteriores.

- **API:**
  - `db.test.ts`, migración:
    - crear un archivo SQLite temporal con el esquema viejo (sin `coverUrl`) e insertar una fila;
    - `openDb` sobre ese archivo agrega la columna, y la fila sigue ahí con `coverUrl` en `null`;
    - abrir dos veces no falla.
  - Tests de creación y edición:
    - POST con `coverUrl` `https` válido → 201, y se devuelve tal cual;
    - `http` → 201;
    - `ftp://…`, `javascript:alert(1)`, `"no es url"` y una URL de 2001 caracteres → 422 con `fields.coverUrl`;
    - PATCH `{ coverUrl: null }` quita la portada;
    - GET devuelve `coverUrl: null` en libros sin portada.
  - `google-books.test.ts`: `thumbnail`; `smallThumbnail` cuando no hay `thumbnail`; `http` → `https`; sin `imageLinks` → `null`.
- **Web:**
  - `book-card`:
    - con `coverUrl`, renderiza un `img` con el `alt` esperado;
    - sin `coverUrl`, muestra el placeholder con la inicial;
    - al disparar el evento `error` en el `img`, aparece el placeholder;
    - al cambiar `coverUrl`, vuelve a intentar.
  - `book-form`:
    - el campo existe y en edición se carga;
    - vacío → `null` al enviar;
    - muestra la vista previa con un valor y el mensaje cuando la imagen falla;
    - muestra el 422 de `coverUrl`;
    - el prefill completa `coverUrl`.
  - `book-lookup`: un candidato con `coverUrl` muestra la miniatura.
  - `book-list`: en el flujo completo de Google, el body del POST incluye el `coverUrl` del candidato.

## Fuera de alcance

Subir archivos, descargar o cachear imágenes, proxy de imágenes, tamaños de imagen más grandes (`zoom`), buscar por portada, cambiar la portada desde la card sin abrir "Editar", y validar en el servidor que la URL apunte a una imagen real.
