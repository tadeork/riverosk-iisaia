# riverosk-iisaia

Repositorio de Tadeo Riveros para el curso IISAIA (FIUBA). Es un solo repo público con las tres entregas. El historial de git, las branches, los PRs, los specs y los planes son parte de lo que se evalúa: muestran el proceso, no solo el resultado.

## Estructura

```
README.md          índice del repo (una fila por entrega)
tp1/               bad UI en un HTML (index.html). Entregado.
tp2/               contrato OpenAPI (openapi.yaml). Entregado.
tp-final/          Scriptorium: API Express + SQLite (api/) y web Angular (web/)
  CLAUDE.md        reglas, estructura y comandos de tp-final
  docs/superpowers/specs/, plans/   un spec y un plan por feature
.claude/           settings y hooks del proyecto para Claude Code
.superpowers/sdd/  ledgers locales de subagent-driven-development (ignorados por git)
```

En cada TP, `README.md` es el informe y `prompts.md` es el registro de prompts. Lo propio de `tp-final/` (arquitectura, reglas de código, comandos) está en `tp-final/CLAUDE.md`, que Claude Code carga al trabajar en esa carpeta. No se repite acá.

## Reglas

- **Evidencia real.** No inventar specs, planes, PRs, revisiones ni resultados de tests. No reescribir historial publicado: nada de force push, rebase de `main` ni `--amend` sobre commits pusheados. No cambiar fechas de commits.
- **`prompts.md` es un registro textual.** Los prompts se copian tal cual, con errores de tipeo incluidos; no se corrigen ni se reescriben.
- **tp1 y tp2 están entregados.** No se tocan salvo pedido explícito.
- **Las decisiones de diseño y de alcance son del usuario.** Se preguntan de a una, con alternativas, y no se eligen en silencio por default.
- **Flujo (GitHub Flow).** Branch `feature/<descripcion>` desde `main`, commits chicos y PR a `main`. Para una feature nueva de tp-final: spec, plan e implementación con TDD (superpowers).
- **Commits** en español, con el prefijo de la entrega (`TP final: ...`), sin `Co-Authored-By` ni atribución a Claude, ni en commits ni en PRs.
- **No commitear** `.DS_Store`, `node_modules/`, `dist/`, `tp-final/api/data/` ni `.superpowers/`.

## Antes de dar una tarea por terminada

- Cambios en `tp-final/`: correr la verificación de `tp-final/CLAUDE.md` y citar la salida real.
- Cambios en documentación (README, informes, specs): comprobar que existan los archivos que enlazan y que los comandos que se citan sean los de `tp-final/CLAUDE.md`.
- Decir lo que no se pudo verificar en lugar de darlo por bueno.

## Acciones que se confirman con el usuario antes

- `git push`, abrir o mergear un PR, borrar branches.
- Instalar, actualizar o quitar dependencias (`npm install`, `npm uninstall`, etc.) y cambiar versiones en `package.json`.
- Borrar archivos.
- Cualquier cosa sobre `tp-final/api/data/`: es la base SQLite con los datos reales del usuario, está fuera de git y no se puede recuperar. Los tests no la usan.
- Pedidos a Google Books con la key real. `GOOGLE_BOOKS_API_KEY` vive en el entorno del usuario: no se imprime, no se copia a archivos y no se commitea.

## Qué hace cumplir `.claude/` y qué no

Estas reglas son instrucciones. Solo algunas tienen un control determinista en `.claude/settings.json`:

| Control | Qué hace |
|---|---|
| `attribution` vacío | Claude Code no agrega su atribución a commits ni PRs. |
| Hook `guard-bash.mjs` (PreToolUse, Bash) | Bloquea force push, `git clean -x`/`-X`, commits o PRs con atribución a Claude y comandos que borran o mueven `tp-final/api/data`. Revisa el texto del comando: no ve un mensaje de commit leído de archivo (`-F`) ni lo que haga un script intermedio. |
| Hook `verify-tp-final.mjs` (Stop) | Si hay cambios sin commitear en `tp-final/api` o `tp-final/web`, corre los tests, `tsc` y el build de esa parte. Si fallan, devuelve la salida y no deja cerrar el turno; en la segunda parada seguida ya no bloquea. No corre sobre lo ya commiteado. |
| Permisos `ask` / `deny` | Piden confirmación para push, PR, merge, `rm`, cambios de dependencias y ediciones en tp1/tp2. Prohíben el force push y editar `tp-final/api/data`. Se comparan con el comienzo de cada comando, así que no cubren variantes que empiecen distinto. |

Lo demás (evidencia real, `prompts.md` textual, decisiones del usuario) depende de que se respete esta guía y de la revisión del usuario.
