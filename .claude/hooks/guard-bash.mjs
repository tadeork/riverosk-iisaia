// PreToolUse (Bash): bloquea comandos que este repo no admite.
// Sale con 2 y el motivo por stderr: Claude Code cancela el comando y le pasa el motivo al agente.
// Revisa el texto del comando: un mensaje de commit leído de un archivo (-F) o un script
// intermedio quedan fuera de su alcance.

import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input?.tool_input?.command ?? '';

function block(reason) {
  process.stderr.write(`Bloqueado por .claude/hooks/guard-bash.mjs: ${reason}\n`);
  process.exit(2);
}

// Partes del comando separadas por ; && || | y saltos de línea.
const segments = command.split(/;|&&|\|\||\||\n/);

for (const segment of segments) {
  if (/\bgit\s+push\b/.test(segment)) {
    if (/\s--force(-with-lease|-if-includes)?\b|\s-[a-zA-Z]*f[a-zA-Z]*(\s|$)|\s\+\S/.test(segment)) {
      block('force push. El historial publicado es la evidencia del proceso y no se reescribe.');
    }
  }
  if (/\bgit\s+clean\b/.test(segment) && /\s-[a-zA-Z]*[xX]/.test(segment)) {
    block('git clean con -x/-X borra archivos ignorados: la base de tp-final/api/data y los ledgers de .superpowers/.');
  }
}

if (/\bgit\s+commit\b|\bgh\s+pr\s+(create|edit)\b/.test(command)) {
  if (/co-authored-by:[^\n]*(claude|anthropic)|generated with \[?claude code|noreply@anthropic\.com/i.test(command)) {
    block('atribución a Claude en un commit o PR. En este repo los commits y PRs van sin Co-Authored-By ni "Generated with Claude Code".');
  }
}

const destructive = /\b(rm|mv|unlink|truncate|shred)\b|\s-delete\b/;
const dataReason =
  'el comando borra o mueve la base de tp-final/api/data, que tiene datos reales y no está en git. Pedile al usuario que lo haga él.';

if (/api\/data|scriptorium\.db/.test(command)) {
  if (destructive.test(command) || />\s*\S*scriptorium\.db/.test(command)) block(dataReason);
}

// Paths relativos: "data" a secas cuando el comando corre en tp-final/api o entra ahí con cd.
const inApi = /tp-final\/api\/?$/.test(input?.cwd ?? '') || /\bcd\s+(\S*\/)?api\/?(\s|$)/.test(command);
if (inApi && segments.some((s) => destructive.test(s) && /(^|\s|\.\/)data(\/|\s|$)/.test(s))) {
  block(dataReason);
}

process.exit(0);
