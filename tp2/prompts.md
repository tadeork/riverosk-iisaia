# Prompts — TP 2

El registro del proceso, en orden. Una sola conversación con Claude Code (Opus 5.5). En vez de dictar el contrato de una vez, le pedí al modelo que me hiciera las preguntas de a una, y el yaml salió de mis respuestas.

---

## 1 — Pedido inicial

```
tengo que completar el TP 2
```

**Qué buscaba:** arrancar sin un prompt armado. Quería que el modelo encontrara la consigna y me dijera qué faltaba, antes de decidir nada.

El modelo leyó la consigna en el material del curso, me avisó que lo que había en `tp2/` era el ejemplo de la cátedra y me preguntó dos cosas. Elegí **Torneo** como dominio y **esta conversación** como registro del proceso. Después me tiró un resumen de requisitos y una lista de decisiones abiertas para que escribiera el prompt del contrato.

---

## 2 — Preguntas de a una

```
no me queda claro qué tengo que responder, dame las preguntas de a una para poder completar el tp
```

**Qué buscaba:** el resumen de decisiones abiertas me resultó demasiado para responder de una. Preferí ir decidiendo de a una cosa por vez, con opciones concretas, para que cada parte del contrato saliera de una respuesta mía y no de un default del modelo.

El modelo me fue haciendo preguntas de opción múltiple. Mis respuestas:

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | Recursos principales | Torneos y partidos (`/tournaments/{tournamentId}/matches`) |
| 2 | Cómo aparecen los equipos | Como texto (`home_team`, `away_team`) |
| 3 | Campos del torneo | `name`, `sport`, `start_date`, `end_date` |
| 4 | Campos obligatorios del torneo | Todos |
| 5 | Campos del partido | `date`, `home_score` / `away_score`, `venue`, `status` |
| 6 | Campos obligatorios al crear un partido | Todos (`date`, `venue`, `home_score` / `away_score`, `status`) |
| 7 | Endpoints | `GET`/`POST /tournaments`, `GET`/`POST .../matches`, `GET .../matches/{matchId}`, `DELETE .../matches/{matchId}` |
| 8 | Respuesta del `DELETE` | `204` sin cuerpo |
| 9 | `GET` de partidos de un torneo que no existe | `404` |
| 10 | Schemas de entrada y salida | Separados |
| 11 | Cuándo da `400` el `POST` de un partido | Falta un campo obligatorio, o el mismo equipo está dos veces |

Con eso el modelo generó `openapi.yaml`: 6 endpoints en 3 paths, con los schemas `Tournament`, `TournamentInput`, `Match` y `MatchInput`. Lo validó con Redocly contra la spec y pasó.

---

## 3 — Commit y corrección del resultado

```
haz el commit y push, luego sigamos con lo que falta
```

**Qué buscaba:** dejar subida la primera versión y después corregir lo que estaba mal, para que la corrección quede como un paso aparte en el historial.

Después del commit, el modelo me preguntó qué hacer con `home_score` / `away_score`, que en la pregunta 6 yo había marcado como obligatorios al crear un partido. Elegí **hacerlos opcionales**: se sacaron del `required` de `MatchInput` y de `Match`. Un partido `scheduled` o `cancelled` no tiene resultado.

---

## 4 — Completar el informe

```
completalo
```

**Qué buscaba:** que el modelo redactara las partes del README y de este archivo que habían quedado pendientes, a partir de las decisiones que yo ya había tomado en las respuestas.

El modelo me había propuesto que yo escribiera el porqué de cada decisión y el análisis del error. Le pedí que lo redactara él y después revisé el texto.

---

## Conversación completa

Una sola conversación, sin reiniciar el hilo.
