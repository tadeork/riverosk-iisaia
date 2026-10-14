# Prompts — Trabajo Práctico Final

El registro del proceso, en orden. Cinco sesiones de Claude Code (Opus 5.5) entre el 5 y el 13 de octubre, más una sexta el 14 para cerrar. Desde la segunda trabajé con el plugin superpowers. Los prompts van sin editar, con errores de tipeo incluidos.

Muchos de mis mensajes son respuestas cortas ("si", "2", "A", "directo") a una pregunta del modelo. Para que se entiendan, cada una va con la pregunta que respondía. Las decisiones de diseño las tomé respondiendo preguntas de opción múltiple durante el `brainstorming` de cada ciclo, y van en tablas.

---

## Antes de empezar: cómo encarar el TP (5 al 7 de octubre)

### 1 — Trasladar el proyecto que ya tenía

```
ahora vamos a hacer el TP 3, para esto ya lo tengo hecho pero quiero trasladar ese proyecto a el TP sólo para cumplir con la consigna. Alguna pregunta?
```

**Qué buscaba:** mi primera idea era traer Scriptorium, una app que ya tenía hecha, y armar el informe alrededor.

El modelo me preguntó dónde estaba el proyecto, si tenía historial de git y qué evidencia del proceso existía (spec, plan, `CLAUDE.md`, backend con persistencia). También me avisó que no iba a inventar specs, planes, branches ni PRs que no hubieran pasado.

### 2 — El original como guía

```
vamos a tomar como guía el proyecto Scriptorium que está en /Users/tadeork/workspace/scriptorium-projects/scriptorium
```

El modelo propuso traerlo con `git subtree` para conservar su historial y me preguntó qué hacer con lo que le faltaba según la consigna. Rechacé la pregunta sin responderla.

### 3 — Cerrar lo pendiente del original

```
primero commitea los cambios
```

```
si, mandalo
```

**Qué buscaba:** dejar el repo original (`bookyman`) limpio antes de usarlo como referencia. El modelo commiteó los cambios pendientes y, antes de pushear, me avisó que el push publicaba en Firebase Hosting. Lo confirmé con el segundo mensaje.

### 4 — Desde cero, no un one shot

```
quiero que crees todo desde el principio commit a commit, no es un one shot
```

El modelo me preguntó si quería decir reconstruir la app de cero o traer los 65 commits del original. Respondí escribiendo:

```
si, reconstrucción desde cero pero quiero que lo hagas como agentes o skills
```

**Qué buscaba:** que el repo del curso mostrara un proceso real. Una copia del original o una repetición de su historial no muestra cómo dirigí el trabajo.

El modelo guardó el plan en la memoria del proyecto y me pidió instalar superpowers.

```
las fechas son nuevas, tiene que ser algo nuevo
```

**Qué buscaba:** dejar claro que los commits tenían que llevar las fechas reales de cuando se hicieran, no las del original. El modelo confirmó que no se copiaban ni se tocaban fechas.

Después instalé el plugin:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

---

## Ciclo 1 — Núcleo (7 de octubre)

### 5 — Arranque

```
arrancamos el TP final
```

El modelo abrió `brainstorming`. Mis respuestas:

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Cómo resolver la persistencia del lado del servidor | API propia + SQLite |
| 2 | Qué entra en el primer spec | CRUD + estados + progreso |
| 3 | Framework del frontend | Angular (como el original) |
| 4 | Uno o varios usuarios | Un solo usuario, sin login |
| 5 | Cómo se guarda el progreso de lectura | `pagesRead` (entero) |
| 6 | Enfoque del backend | Express + SQLite + OpenAPI |

### 6 — Aprobación del diseño, sección por sección

El modelo presentó el diseño en tres secciones y esperó mi aprobación en cada una.

Sección 1, modelo de datos y endpoints:

```
está bien así, en qué carpeta vas a trabajar? pasame el path completo con pwd
```

Sección 2, estructura de carpetas y responsabilidades:

```
procede
```

Sección 3, tests y lo que queda fuera de alcance:

```
si está bien
```

El modelo escribió el spec en `docs/superpowers/specs/2026-10-07-scriptorium-core-design.md`, en la branch nueva `feature/scriptorium-core`, y me marcó cuatro reglas que había agregado sin que estuvieran en las secciones (por ejemplo, que un `PATCH` con body vacío responda 422). Las acepté:

```
proceed
```

Con eso pasó a `writing-plans` y commiteó el plan de 8 tareas.

### 7 — Ejecución

En una sesión nueva:

```
en donde te quedaste?
```

El modelo leyó el spec y el plan del disco, me dijo que no había código todavía y me preguntó si arrancaba con la tarea 1 usando subagentes.

```
si
```

Las 8 tareas las ejecutó `subagent-driven-development`: un subagente implementaba cada tarea con TDD y otro la revisaba. Al final hubo una revisión de la rama completa. El modelo me preguntó qué hacer con la rama: merge local, push con PR o dejarla.

```
2
```

Push y PR #1, que mergeé desde GitHub.

### 8 — Qué seguía

```
qué más podemos hacer para mejorar el proyecto?
```

El modelo separó lo que pesaba para la entrega (cerrar el PR, escribir la reflexión del README, repetir el ciclo en otra feature), las features que el spec había dejado fuera de alcance, como la búsqueda externa o la PWA, y algunos pendientes técnicos. Recomendó la búsqueda en Google Books.

---

## Ciclo 2 — Búsqueda en Google Books (8 al 13 de octubre)

### 9 — Arranque

```
mergea el pr y continuemos
```

El PR ya estaba mergeado, así que el modelo actualizó `main` y abrió `brainstorming`. Mis respuestas:

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Para qué sirve la búsqueda externa | Ahorrar tipeo al agregar un libro |
| 2 | De qué fuente salen los datos | Solo Google Books |
| 3 | Dónde vive la búsqueda en la interfaz | Dentro del modal de alta |

El modelo propuso tres enfoques: un adaptador inyectable detrás de `GET /api/lookup` sin caché, el mismo con caché, o llamar a Google directo desde el navegador. Elegí el primero:

```
si, sigamos
```

### 10 — Aprobación del diseño

Sección de la API (adaptador, ruta y tests sin red):

```
si, continua
```

Sección del frontend (`lookup.api.ts`, `book-lookup` y precarga del formulario):

```
si, continúa
```

Sección de errores, seguridad de la key y lo que queda fuera de alcance:

```
si, continua
```

El modelo escribió el spec en la branch `feature/google-books-lookup`. En ese punto la sesión se quedó sin contexto y siguió con un resumen automático de lo anterior.

### 11 — Del spec al plan

```
qué falta?
```

```
haz push y continuemos
```

Lo tomé como aprobación del spec: el modelo pusheó la rama y escribió el plan. Me preguntó si ejecutarlo con subagentes o directo, y antes de responder quise ver la app:

```
podemos levantar el proyecto para ver cómo está?
```

El modelo levantó la API y el frontend, y me pasó un recorrido para probar el núcleo en el navegador.

```
continuemos con el plan
```

No dije cómo ejecutarlo, así que el modelo fue con lo que había recomendado: subagentes, como en el núcleo.

### 12 — Cierre del ciclo

Al terminar, el modelo volvió a preguntarme qué hacer con la rama.

```
continua, haz merge a main
```

**Lo que salió mal:** elegí merge local en vez de PR, así que esta feature no tiene PR en GitHub. Está registrado en el README, en "Qué salió mal".

Para probar contra Google de verdad hacía falta una API key:

```
en donde genero la api key?
```

```
listo, está en el zshrc
```

```
subiste los cambios?
```

```
si
```

El modelo pusheó `main` y borró la rama vieja del remoto.

---

## Ciclo 3 — Portadas (13 de octubre)

### 13 — Arranque

```
continua
```

El modelo me propuso tres caminos: un ajuste chico (mostrar el ISBN en los resultados), un ciclo nuevo o cerrar ahí.

```
la ui funciona, continuemos con el punto 2
```

Mis respuestas en `brainstorming`:

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Qué funcionalidad para el tercer ciclo | Portadas |
| 2 | De dónde sale la portada | De Google y también como URL cargada a mano |
| 3 | Cómo se guarda (A: solo la URL, B: descargar la imagen, C: proxy de imágenes) | A |

La tercera la respondí escribiendo:

```
A
```

### 14 — Spec y plan

Después de la sección de datos y API:

```
si, procede y haz los commits
```

**Lo que salió mal:** con esa respuesta el modelo escribió el spec entero, incluidas las partes de interfaz y de manejo de errores, sin presentármelas antes por separado. Es el ciclo donde más quedó afuera: el spec no cubrió las miniaturas rotas en los resultados de Google, que hubo que corregir después de implementar.

```
si, está bien, procede
```

El modelo escribió el plan y me preguntó si ejecutarlo con subagentes o directo. Recomendó subagentes porque la migración tocaba mi base real.

```
directo
```

**Qué buscaba:** un ciclo más rápido. El modelo implementó todo en la sesión principal y al final hubo una sola revisión de la rama.

### 15 — Cierre del ciclo

```
1
```

Merge local otra vez, sin PR.

```
si
```

Push de `main`.

---

## Informe (13 de octubre)

### 16 — Revisión antes de entregar

```
creo que está listo para entregar, verdad?
```

El modelo comparó el repo con la consigna y encontró lo que faltaba: las secciones de reflexión del README, las dos features sin PR, este archivo, el README raíz que marcaba el TP final como "en blanco", un enlace al spec de portadas y el `.DS_Store` commiteado.

```
completa el informe, la carpeta .DS_Store debería estar en el gitignore, mergea el PR, main debe estar completo, enlaza el spac
```

Entró por el PR #2. No respondí lo de `prompts.md`, así que quedó pendiente.

---

## Cierre (14 de octubre)

### 17 — Lo que faltaba

```
qué falta hacer para completar el TP?
```

El modelo volvió a comparar el repo con la consigna. Faltaba este archivo: el curso pide los prompts principales en el informe y `tp1/` y `tp2/` lo tienen.

```
completa lo que falta
```

Este archivo lo armó el modelo a partir de los transcripts locales de Claude Code. Los prompts están copiados tal cual; el contexto de cada uno es un resumen de lo que respondió el modelo.
