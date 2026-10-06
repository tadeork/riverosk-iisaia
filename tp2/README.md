# TP 2 — API de torneos y partidos

Un `openapi.yaml` que describe una API donde cada torneo agrupa partidos y un partido no existe fuera de un torneo. Seis endpoints en tres paths, sin nada implementado: el entregable es el contrato.

## Cómo se lee

Pegar el contenido de [openapi.yaml](openapi.yaml) en [editor.swagger.io](https://editor.swagger.io). Del lado derecho aparece la documentación navegable, con cada endpoint desplegable.

## Qué me propuse construir

<!-- COMPLETAR: por qué elegiste torneos y partidos, y por qué la relación justifica anidar. -->

| Método | Path | Respuestas |
|--------|------|------------|
| `GET` | `/tournaments` | `200` |
| `POST` | `/tournaments` | `201` / `400` |
| `GET` | `/tournaments/{tournamentId}/matches` | `200` / `404` |
| `POST` | `/tournaments/{tournamentId}/matches` | `201` / `400` / `404` |
| `GET` | `/tournaments/{tournamentId}/matches/{matchId}` | `200` / `404` |
| `DELETE` | `/tournaments/{tournamentId}/matches/{matchId}` | `204` / `404` |

## Decisiones que tomé yo

<!-- COMPLETAR: el porqué de cada una va en tus palabras. -->

**Anidar `matches` dentro de `tournaments`.** <!-- por qué y no /matches?tournament=3 -->

**Equipos como texto y no como un recurso aparte.** <!-- por qué -->

**Schemas de entrada y de salida separados.** <!-- por qué MatchInput no lleva id ni tournament_id -->

**`204` sin cuerpo en el borrado.** <!-- por qué -->

**`404` en el `GET` de partidos de un torneo inexistente, no lista vacía.** <!-- por qué -->

**`400` si `home_team` y `away_team` son el mismo equipo.** <!-- por qué -->

**Todos los campos del torneo obligatorios.** <!-- por qué -->

## Qué salió mal y cómo lo corregí

<!-- COMPLETAR después de leer el yaml en editor.swagger.io. -->

## Prompts

El registro completo está en [prompts.md](prompts.md).
