import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { makeApp } from './helpers.js';

describe('front servido desde la API (WEB_DIR)', () => {
  let web: ReturnType<typeof request>;
  let webDir: string;

  beforeAll(() => {
    webDir = mkdtempSync(join(tmpdir(), 'scriptorium-web-'));
    writeFileSync(join(webDir, 'index.html'), '<h1>Scriptorium</h1>');
    writeFileSync(join(webDir, 'app.js'), 'console.log(1)');
    web = request(createApp(openDb(':memory:'), { search: async () => [], webDir }));
  });

  test('GET / devuelve index.html', async () => {
    const res = await web.get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('Scriptorium');
  });

  test('GET /app.js devuelve el archivo', async () => {
    const res = await web.get('/app.js');
    expect(res.status).toBe(200);
    expect(res.text).toContain('console.log(1)');
  });

  test('GET /libro/123 devuelve index.html', async () => {
    const res = await web.get('/libro/123');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Scriptorium');
  });

  test('GET /api/nada sigue siendo 404 JSON', async () => {
    const res = await web.get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('POST /libro/123 no devuelve index.html', async () => {
    const res = await web.post('/libro/123');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('Scriptorium');
  });

  test('con WEB_DIR relativa (como en Render) también resuelve las rutas del front', async () => {
    const app = createApp(openDb(':memory:'), { search: async () => [], webDir: relative(process.cwd(), webDir) });
    const res = await request(app).get('/libro/123');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Scriptorium');
  });

  test('sin webDir, GET / da 404', async () => {
    const res = await makeApp().get('/');
    expect(res.status).toBe(404);
  });
});
