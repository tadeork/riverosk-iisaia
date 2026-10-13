import { HttpError } from '../src/errors.js';
import type { BookCandidate } from '../src/lookup/google-books.js';
import { makeApp } from './helpers.js';

const CANDIDATE: BookCandidate = {
  title: 'Rayuela', author: 'Julio Cortázar', isbn: '9788437604572', pages: 600, description: null,
};

describe('GET /api/lookup', () => {
  test('200 con los candidatos y q recortado', async () => {
    const search = vi.fn(async () => [CANDIDATE]);
    const res = await makeApp(search).get('/api/lookup?q=%20rayuela%20');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([CANDIDATE]);
    expect(search).toHaveBeenCalledWith('rayuela');
  });

  test('200 [] sin resultados', async () => {
    const res = await makeApp(async () => []).get('/api/lookup?q=zzz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test.each([
    ['ausente', ''],
    ['vacío', '?q='],
    ['solo espacios', '?q=%20%20'],
    ['de 201 caracteres', `?q=${'a'.repeat(201)}`],
    ['repetido', '?q=a&q=b'],
  ])('q %s → 400 BAD_REQUEST', async (_name, qs) => {
    const search = vi.fn(async () => [CANDIDATE]);
    const res = await makeApp(search).get(`/api/lookup${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(search).not.toHaveBeenCalled();
  });

  test('q de exactamente 200 caracteres → 200', async () => {
    const res = await makeApp(async () => []).get(`/api/lookup?q=${'a'.repeat(200)}`);
    expect(res.status).toBe(200);
  });

  test('502 se propaga con la forma de error', async () => {
    const search = vi.fn(async () => {
      throw new HttpError(502, 'UPSTREAM_ERROR', 'No se pudo consultar Google Books');
    });
    const res = await makeApp(search).get('/api/lookup?q=rayuela');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: { code: 'UPSTREAM_ERROR', message: 'No se pudo consultar Google Books' } });
    expect(JSON.stringify(res.body)).not.toContain('googleapis');
  });
});
