# Scriptorium — Escaneo de la tapa con la cámara (diseño)

Fecha: 2026-10-14
Estado: diseño aprobado en el chat (botón en el alta que abre la cámara, OCR en vivo con Tesseract.js, sin foto). Los detalles marcados como "agregado" los propuso el modelo; el usuario los aprobó al revisar este spec.
Ciclos anteriores, todos mergeados:
- `2026-10-07-scriptorium-core-design.md` (núcleo);
- `2026-10-12-google-books-lookup-design.md` (búsqueda en Google Books);
- `2026-10-13-portadas-design.md` (portadas).

## Objetivo

Al agregar un libro, el usuario abre la cámara, apunta a la tapa y el texto que se lee va apareciendo en el campo de búsqueda de Google Books, sin sacar una foto. Cuando el texto se ve bien, aprieta **Buscar** y sigue el flujo del ciclo 2: candidatos, elegir uno y revisar el formulario.

### Criterios de éxito

- En "Agregar libro" hay un botón **Escanear tapa**. En "Editar" no, porque el buscador solo aparece en el alta.
- Al apretarlo se ve el video de la cámara con un recuadro guía, sin sacar una foto.
- Mientras la cámara está abierta, el texto leído dentro del recuadro reemplaza el del campo de búsqueda, una vez por segundo como mucho.
- **Cerrar cámara**, apretar **Buscar** o cerrar el modal apagan la cámara: el indicador de cámara del sistema se apaga.
- Si no hay cámara o el usuario niega el permiso, se muestra un error y el alta a mano sigue funcionando.
- Los cuadros de video no salen del navegador.
- Los tests no abren la cámara ni descargan modelos.

## Decisiones

| Tema | Decisión | Alternativas descartadas |
|---|---|---|
| Entrada | Video en vivo de la cámara (`getUserMedia`) | Sacar o subir una foto |
| OCR | Tesseract.js en el navegador, idioma `spa`, modelos preentrenados | Entrenar un OCR propio; PaddleOCR con ONNX (más configuración); OCR en el servidor |
| Ritmo | Un cuadro por segundo, y nunca dos lecturas a la vez | Cada cuadro del video (ningún OCR de navegador da abasto) |
| Qué se hace con el texto | Reemplaza el texto del campo de búsqueda; el usuario decide cuándo buscar | Buscar solo cuando el texto se estabiliza (más lógica, no entra en el tiempo) |
| Dispositivo para probar | Webcam de la notebook en `localhost` | Celular (necesita HTTPS: queda para el deploy) |
| Carga de Tesseract | Import dinámico al abrir la cámara | Import estático (agranda el bundle inicial para todos) |

## Diseño

### Piezas nuevas en `web/src/app/`

- **`camera.ts` — `Camera`** (servicio). `open(): Promise<MediaStream>` pide `getUserMedia({ video: { facingMode: 'environment' }, audio: false })`. Es la única pieza que toca `navigator.mediaDevices`.
- **`cover-ocr.ts` — `CoverOcr`** (servicio). `read(video: HTMLVideoElement): Promise<string>` copia a un canvas la zona del recuadro guía (agregado: 80 % del ancho y 40 % del alto, centrada) y la pasa a un worker de Tesseract. El worker se crea en la primera lectura, con `import('tesseract.js')`, y se reutiliza mientras la app esté abierta, así volver a abrir la cámara no recarga el modelo. Es la única pieza que conoce Tesseract y el canvas.
- **`cover-scanner/` — `CoverScannerComponent`.** Al crearse abre la cámara y muestra el `<video>` con el recuadro guía encima. Cada segundo, si no hay una lectura en curso, llama a `CoverOcr.read` y emite el resultado por `text`. Al destruirse frena el intervalo y apaga las pistas del stream. Si `open()` falla, muestra el error.

`Camera` y `CoverOcr` se inyectan, como `LookupApi`: en los tests se reemplazan por falsos.

### Cambios en `book-lookup/`

- Botón **Escanear tapa** junto a **Buscar**. Con la cámara abierta, el botón pasa a decir **Cerrar cámara**.
- Debajo de la fila del buscador se muestra `<app-cover-scanner>` mientras la cámara está abierta.
- `(text)` del scanner: se limpia el texto (saltos de línea y espacios repetidos a un espacio, sin espacios en los extremos, hasta 200 caracteres). Si queda vacío se ignora; si no, reemplaza la consulta.
- **Buscar** cierra la cámara antes de buscar (agregado: deja de gastar CPU mientras se eligen candidatos).

### Errores

- Permiso negado o sin cámara: "No se pudo abrir la cámara. Revisá el permiso del navegador o buscá a mano." El mensaje se ve en el lugar del video hasta que el usuario aprieta **Cerrar cámara**.
- Falla una lectura del OCR, por ejemplo porque no se pudo descargar el modelo: se muestra "No se pudo leer la tapa." y la cámara sigue abierta. La lectura siguiente vuelve a intentar.

## Testing

- `cover-scanner.spec.ts`, con `Camera` y `CoverOcr` falsos y timers falsos de vitest:
  - al crearse pide la cámara y asigna el stream al video;
  - cada segundo emite el texto leído;
  - no lanza una lectura nueva mientras la anterior sigue en curso;
  - al destruirse apaga las pistas del stream y no lee más;
  - si `open()` falla, muestra el error de cámara;
  - si `read()` falla, muestra el error de lectura y sigue leyendo.
- `book-lookup.spec.ts`:
  - el botón **Escanear tapa** muestra el scanner, y **Cerrar cámara** lo saca;
  - el texto del scanner, limpio, reemplaza la consulta; el texto vacío se ignora;
  - **Buscar** saca el scanner.
- `Camera` y `CoverOcr` no tienen tests unitarios: son adaptadores finos sobre APIs del navegador y Tesseract, y jsdom no tiene cámara ni canvas. Se verifican a mano con la webcam en `localhost`.

## Dependencias

- `tesseract.js` en `web/` (confirmado por el usuario). El modelo de idioma y el núcleo WebAssembly se descargan de su CDN la primera vez que se abre la cámara.

## Fuera de alcance

- Leer el código de barras ISBN.
- Detectar solo cuándo el texto se estabilizó y buscar automáticamente.
- Elegir entre varias cámaras.
- Probar en el celular: necesita HTTPS y queda para el deploy en Render, que está en pausa.
- Cambios en la API o en `openapi.yaml`: todo pasa en el navegador.
