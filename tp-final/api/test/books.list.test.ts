import { makeApp } from './helpers.js';

async function seed() {
  const api = makeApp();
  await api.post('/api/books').send({ title: 'b-libro', author: 'Zeta', status: 'reading' });
  await api.post('/api/books').send({ title: 'A-libro', author: 'alfa', isbn: '978-1' });
  await api.post('/api/books').send({ title: '100% real', author: 'Mu' });
  return api;
}
const titles = (res: { body: { title: string }[] }) => res.body.map((b) => b.title);

test('sin params ordena newest: el último creado primero', async () => {
  const res = await (await seed()).get('/api/books');
  expect(res.status).toBe(200);
  expect(titles(res)).toEqual(['100% real', 'A-libro', 'b-libro']);
});

test('sort=oldest', async () => {
  const res = await (await seed()).get('/api/books?sort=oldest');
  expect(titles(res)).toEqual(['b-libro', 'A-libro', '100% real']);
});

test('sort=title ignora mayúsculas', async () => {
  const res = await (await seed()).get('/api/books?sort=title');
  expect(titles(res)).toEqual(['100% real', 'A-libro', 'b-libro']);
});

test('sort=author ignora mayúsculas', async () => {
  const res = await (await seed()).get('/api/books?sort=author');
  expect(titles(res)).toEqual(['A-libro', '100% real', 'b-libro']);
});

test('status=reading filtra', async () => {
  const res = await (await seed()).get('/api/books?status=reading');
  expect(titles(res)).toEqual(['b-libro']);
});

test('q busca en title, author e isbn sin distinguir mayúsculas', async () => {
  const api = await seed();
  expect(titles(await api.get('/api/books?q=ZETA'))).toEqual(['b-libro']);
  expect(titles(await api.get('/api/books?q=978'))).toEqual(['A-libro']);
});

test('q matchea por title aunque el isbn sea NULL', async () => {
  expect(titles(await (await seed()).get('/api/books?q=real'))).toEqual(['100% real']);
});

test('q vacío equivale a no filtrar', async () => {
  const res = await (await seed()).get('/api/books?q=');
  expect(res.status).toBe(200);
  expect(titles(res)).toEqual(['100% real', 'A-libro', 'b-libro']);
});

test('q con % es literal', async () => {
  expect(titles(await (await seed()).get('/api/books?q=%25'))).toEqual(['100% real']);
});

test('q con _ es literal', async () => {
  expect((await (await seed()).get('/api/books?q=_')).body).toEqual([]);
});

test('status inválido → 400 BAD_REQUEST', async () => {
  const res = await makeApp().get('/api/books?status=nope');
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('BAD_REQUEST');
  expect(res.body.error.fields).toBeUndefined();
});

test('sort inválido → 400 BAD_REQUEST', async () => {
  const res = await makeApp().get('/api/books?sort=nope');
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('BAD_REQUEST');
});
