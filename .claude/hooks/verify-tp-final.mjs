// Stop: si hay cambios sin commitear en tp-final/api o tp-final/web, corre la verificación
// de esa parte. Si algo falla, devuelve decision "block" con la salida, así el agente
// no cierra el turno con tests rojos. En la segunda parada seguida (stop_hook_active)
// no vuelve a bloquear, para no entrar en un loop.

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const status = spawnSync('git', ['status', '--porcelain', '--', 'tp-final/api', 'tp-final/web'], {
  cwd: root,
  encoding: 'utf8',
});
if (status.status !== 0) process.exit(0);

const changed = status.stdout.split('\n').filter(Boolean).map((line) => line.slice(3));
const parts = [
  {
    name: 'api',
    dir: join(root, 'tp-final/api'),
    touched: changed.some((p) => p.startsWith('tp-final/api/')),
    checks: [
      ['npm', ['test']],
      ['npx', ['tsc', '--noEmit']],
    ],
  },
  {
    name: 'web',
    dir: join(root, 'tp-final/web'),
    touched: changed.some((p) => p.startsWith('tp-final/web/')),
    checks: [
      ['npx', ['ng', 'test', '--watch=false']],
      ['npx', ['ng', 'build']],
    ],
  },
].filter((part) => part.touched);

if (parts.length === 0) process.exit(0);

const failures = [];
const passed = [];
const skipped = [];

for (const part of parts) {
  if (!existsSync(join(part.dir, 'node_modules'))) {
    skipped.push(`${part.name} (falta npm install)`);
    continue;
  }
  for (const [cmd, args] of part.checks) {
    const label = `${part.name}: ${cmd} ${args.join(' ')}`;
    const run = spawnSync(cmd, args, { cwd: part.dir, encoding: 'utf8', env: { ...process.env, CI: '1' } });
    if (run.status === 0) {
      passed.push(label);
    } else {
      const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n');
      failures.push(`${label} falló:\n${output}`);
    }
  }
}

if (failures.length > 0 && !input.stop_hook_active) {
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        'Verificación de tp-final con cambios sin commitear: falló. Corregilo antes de dar la tarea por terminada, ' +
        'o explicale al usuario por qué queda rojo (por ejemplo, el paso rojo de TDD).\n\n' +
        failures.join('\n\n'),
    }),
  );
  process.exit(0);
}

const summary = [
  passed.length ? `OK: ${passed.join(', ')}` : '',
  failures.length ? `FALLÓ: ${failures.map((f) => f.split('\n')[0]).join(', ')}` : '',
  skipped.length ? `sin correr: ${skipped.join(', ')}` : '',
]
  .filter(Boolean)
  .join(' | ');
process.stdout.write(JSON.stringify({ systemMessage: `Verificación tp-final — ${summary}` }));
process.exit(0);
