# TP 2 — API de torneos y partidos

Un `openapi.yaml` que describe una API donde cada torneo agrupa partidos y un partido no existe fuera de un torneo. Seis endpoints en tres paths, sin nada implementado: el entregable es el contrato.

## Cómo se lee

Pegar el contenido de [openapi.yaml](openapi.yaml) en [editor.swagger.io](https://editor.swagger.io). Del lado derecho aparece la documentación navegable, con cada endpoint desplegable.

## Qué me propuse construir

Un dominio chico con dos recursos y una relación de pertenencia real. Un partido siempre se juega dentro de un torneo: un partido suelto, sin torneo, no tiene sentido en este modelo. Por eso la jerarquía en el path está justificada y no es una cuestión de gusto.

| Método | Path | Respuestas |
|--------|------|------------|
| `GET` | `/tournaments` | `200` |
| `POST` | `/tournaments` | `201` / `400` |
| `GET` | `/tournaments/{tournamentId}/matches` | `200` / `404` |
| `POST` | `/tournaments/{tournamentId}/matches` | `201` / `400` / `404` |
| `GET` | `/tournaments/{tournamentId}/matches/{matchId}` | `200` / `404` |
| `DELETE` | `/tournaments/{tournamentId}/matches/{matchId}` | `204` / `404` |

El contrato no se dictó en un prompt: salió de una serie de preguntas de opción múltiple que fui respondiendo de a una, en una sola conversación.

## Decisiones que tomé yo

**Anidar `matches` dentro de `tournaments` en vez de `/matches?tournament=3`.** La pertenencia es estructural: el partido no tiene dónde vivir sin su torneo. El filtro sobre un path plano sería la forma correcta si un partido pudiera existir suelto, por ejemplo un amistoso. En este modelo no puede.

**Equipos como texto y no como recurso aparte.** Un recurso `teams` con ids habría sumado un tercer recurso, más endpoints y la validación de que el equipo esté inscripto en el torneo. Para este contrato alcanza con el nombre. El costo es aceptado: si un equipo cambia de nombre, sus partidos viejos no se enteran.

**Schemas de entrada y de salida separados.** `MatchInput` no tiene `id` ni `tournament_id`. El `id` lo genera el servidor y el torneo ya viaja en el path. Si el body también trajera `tournament_id`, el contrato no diría qué pasa cuando no coincide con el del path. Lo mismo para `TournamentInput`, que no tiene `id`.

**`204` sin cuerpo en el borrado.** Si el partido ya no existe, devolverlo en la respuesta es describir algo que no está.

**`404` en el `GET` de partidos de un torneo inexistente, no lista vacía.** Devolver `[]` diría que el torneo existe y no tiene partidos. Son dos situaciones distintas y llevan respuestas distintas.

**`400` si `home_team` y `away_team` son el mismo equipo.** Es un dato mal formado aunque todos los campos estén presentes: un equipo no juega contra sí mismo. No agregué la validación de que la fecha del partido caiga dentro de las fechas del torneo; quedó afuera del contrato.

**Todos los campos del torneo obligatorios.** Un torneo sin deporte o sin fechas no se puede organizar, así que no se crea a medias.

## Qué salió mal y cómo lo corregí

En la pregunta sobre los campos obligatorios del partido marqué todos, incluido el resultado (`home_score` y `away_score`). El modelo generó el yaml tal cual, y el contrato quedó contradiciéndose a sí mismo: `status` acepta `scheduled` y `cancelled`, pero para crear un partido había que mandar un resultado. Un partido que todavía no se jugó habría tenido que inventar un `0 a 0`, y ese `0 a 0` falso no se distinguiría de un empate real.

El error fue mío y no del modelo. La pregunta incluso traía la advertencia ("un partido que todavía no se jugó no tiene resultado"), y aun así respondí pensando en el partido terminado, que es el que uno se imagina cuando piensa en un partido, y no en el momento en que se crea. Tampoco lo detecté yo al leer el yaml: me lo señaló el modelo después de generarlo. Lo corregí sacando los dos campos del `required` de `MatchInput` y de `Match`.

La regla que me llevo: cuando un campo depende del estado del recurso, no puede ser obligatorio. Antes de marcar un `required` hay que recorrer cada valor del `enum` de estado y preguntarse si el campo existe en ese estado.

## Prompts

El registro completo está en [prompts.md](prompts.md). El que más pesó fue el segundo, que convirtió el pedido en una serie de decisiones chicas; la corrección está en el tercero.
