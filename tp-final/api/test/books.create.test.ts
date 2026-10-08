import { makeApp } from './helpers.js';

test('POST crea con defaults y devuelve 201 + Location', async () => {
  const api = makeApp();
  const res = await api.post('/api/books').send({ title: '  Rayuela ', author: 'Cortázar' });
  expect(res.status).toBe(201);
  expect(res.headers.location).toBe(`/api/books/${res.body.id}`);
  expect(res.body).toMatchObject({ title: 'Rayuela', author: 'Cortázar', isbn: null, pages: null,
    description: null, status: 'to-read', pagesRead: 0 });
  expect(res.body.createdAt).toBe(res.body.updatedAt);
});

test('GET /:id devuelve el libro creado', async () => {
  const api = makeApp();
  const created = await api.post('/api/books').send({ title: 'Rayuela', author: 'Cortázar', pages: 600 });
  const res = await api.get(`/api/books/${created.body.id}`);
  expect(res.status).toBe(200);
  expect(res.body).toEqual(created.body);
});

test('GET /:id inexistente → 404 NOT_FOUND', async () => {
  const res = await makeApp().get('/api/books/no-existe');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('NOT_FOUND');
});

test('POST sin title → 422 con fields.title', async () => {
  const res = await makeApp().post('/api/books').send({ author: 'Cortázar' });
  expect(res.status).toBe(422);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
  expect(res.body.error.fields.title).toEqual(expect.any(String));
});

test('POST con title "   " → 422 con fields.title', async () => {
  const res = await makeApp().post('/api/books').send({ title: '   ', author: 'Cortázar' });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.title).toEqual(expect.any(String));
});

test.each([[0], [-3], [12.5], ['12']])('POST pages=%s → 422 fields.pages', async (pages) => {
  const res = await makeApp().post('/api/books').send({ title: 'T', author: 'A', pages });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.pages).toEqual(expect.any(String));
});

test('POST ignora id/createdAt/updatedAt del body', async () => {
  const res = await makeApp().post('/api/books')
    .send({ title: 'T', author: 'A', id: 'x', createdAt: '2000-01-01', updatedAt: '2000-01-01' });
  expect(res.status).toBe(201);
  expect(res.body.id).not.toBe('x');
  expect(res.body.createdAt).not.toBe('2000-01-01');
  expect(res.body.updatedAt).not.toBe('2000-01-01');
});

test('POST status read con pages 300 → pagesRead 300', async () => {
  const res = await makeApp().post('/api/books').send({ title: 'T', author: 'A', status: 'read', pages: 300 });
  expect(res.status).toBe(201);
  expect(res.body.pagesRead).toBe(300);
});

test('POST status read sin pages → pagesRead 0', async () => {
  const res = await makeApp().post('/api/books').send({ title: 'T', author: 'A', status: 'read' });
  expect(res.status).toBe(201);
  expect(res.body.pagesRead).toBe(0);
});

test('POST pagesRead 10 sin pages → 422 fields.pagesRead', async () => {
  const res = await makeApp().post('/api/books').send({ title: 'T', author: 'A', pagesRead: 10 });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.pagesRead).toEqual(expect.any(String));
});

test('POST pagesRead 500 con pages 300 → 422 fields.pagesRead', async () => {
  const res = await makeApp().post('/api/books').send({ title: 'T', author: 'A', pages: 300, pagesRead: 500 });
  expect(res.status).toBe(422);
  expect(res.body.error.fields.pagesRead).toEqual(expect.any(String));
});

test('JSON malformado → 400 BAD_REQUEST', async () => {
  const res = await makeApp().post('/api/books').set('Content-Type', 'application/json').send('{"title":');
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('BAD_REQUEST');
});
