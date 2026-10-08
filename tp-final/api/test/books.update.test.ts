import { makeApp } from './helpers.js';

async function setup() {
  const api = makeApp();
  const res = await api.post('/api/books').send({ title: 'T', author: 'A', pages: 300 });
  return { api, book: res.body, url: `/api/books/${res.body.id}` };
}

afterEach(() => {
  vi.useRealTimers();
});

test('PATCH parcial cambia solo lo enviado y actualiza updatedAt', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  const { api, book, url } = await setup();
  vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
  const res = await api.patch(url).send({ title: 'Nuevo' });
  expect(res.status).toBe(200);
  expect(res.body.title).toBe('Nuevo');
  expect(res.body.author).toBe('A');
  expect(res.body.createdAt).toBe(book.createdAt);
  expect(res.body.updatedAt > res.body.createdAt).toBe(true);
});

test('PATCH status read fija pagesRead = pages', async () => {
  const { api, url } = await setup();
  const res = await api.patch(url).send({ status: 'read' });
  expect(res.status).toBe(200);
  expect(res.body.pagesRead).toBe(300);
});

test('PATCH pagesRead 301 → 422 fields.pagesRead', async () => {
  const { api, url } = await setup();
  const res = await api.patch(url).send({ pagesRead: 301 });
  expect(res.status).toBe(422);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
  expect(res.body.error.fields.pagesRead).toBeDefined();
});

test('PATCH pagesRead -1 → 422', async () => {
  const { api, url } = await setup();
  const res = await api.patch(url).send({ pagesRead: -1 });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.pagesRead).toBeDefined();
});

test('PATCH pages 50 con pagesRead actual 120 → 422 fields.pages', async () => {
  const { api, url } = await setup();
  await api.patch(url).send({ pagesRead: 120 });
  const res = await api.patch(url).send({ pages: 50 });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.pages).toBeDefined();
  expect(res.body.error.fields.pagesRead).toBeUndefined();
});

test('PATCH pages 50 + pagesRead 10 → 200', async () => {
  const { api, url } = await setup();
  await api.patch(url).send({ pagesRead: 120 });
  const res = await api.patch(url).send({ pages: 50, pagesRead: 10 });
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ pages: 50, pagesRead: 10 });
});

test('PATCH pages null con pagesRead > 0 → 422', async () => {
  const { api, url } = await setup();
  await api.patch(url).send({ pagesRead: 10 });
  const res = await api.patch(url).send({ pages: null });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.pages).toBeDefined();
});

test('PATCH {} → 422', async () => {
  const { api, url } = await setup();
  const res = await api.patch(url).send({});
  expect(res.status).toBe(422);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});

test('PATCH isbn null vacía el campo', async () => {
  const { api, url } = await setup();
  await api.patch(url).send({ isbn: '123' });
  const res = await api.patch(url).send({ isbn: null });
  expect(res.status).toBe(200);
  expect(res.body.isbn).toBeNull();
  expect((await api.get(url)).body.isbn).toBeNull();
});

test('PATCH id inexistente → 404', async () => {
  const res = await makeApp().patch('/api/books/no-existe').send({ title: 'x' });
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});

test('DELETE → 204 y después GET → 404', async () => {
  const { api, url } = await setup();
  const del = await api.delete(url);
  expect(del.status).toBe(204);
  expect((await api.get(url)).status).toBe(404);
});

test('DELETE inexistente → 404', async () => {
  const res = await makeApp().delete('/api/books/no-existe');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});

test('PATCH pages en libro read sin pagesRead → 200 y pagesRead sigue a pages', async () => {
  const { api, url } = await setup();
  await api.patch(url).send({ status: 'read' });
  const res = await api.patch(url).send({ pages: 250 });
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ pages: 250, pagesRead: 250, status: 'read' });
});

test('PATCH status read + pages null con pagesRead 120 → 200 y pagesRead 0', async () => {
  const { api, url } = await setup();
  await api.patch(url).send({ pagesRead: 120 });
  const res = await api.patch(url).send({ status: 'read', pages: null });
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ pages: null, pagesRead: 0, status: 'read' });
});

test('PATCH ignora id del body (regla 5)', async () => {
  const { api, book, url } = await setup();
  const res = await api.patch(url).send({ id: 'x', title: 'N' });
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(book.id);
  expect(res.body.title).toBe('N');
});
