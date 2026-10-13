import { createGoogleBooksSearch } from '../src/lookup/google-books.js';

function fakeFetch(body: unknown, init?: ResponseInit) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), init);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const volumes = (...volumeInfos: unknown[]) => ({
  kind: 'books#volumes',
  totalItems: volumeInfos.length,
  items: volumeInfos.map((volumeInfo, i) => ({ id: `id${i}`, volumeInfo })),
});

const base = { title: 'T', authors: ['A'] };

test('normaliza un volumen completo', async () => {
  const { fn } = fakeFetch(volumes({
    title: 'Rayuela',
    authors: ['Julio Cortázar'],
    industryIdentifiers: [
      { type: 'ISBN_10', identifier: '8437604575' },
      { type: 'ISBN_13', identifier: '9788437604572' },
    ],
    pageCount: 736,
    description: 'Novela',
    imageLinks: { smallThumbnail: 'https://x/s.jpg', thumbnail: 'https://x/t.jpg' },
  }));
  const res = await createGoogleBooksSearch({ fetch: fn })('rayuela');
  expect(res).toEqual([{ title: 'Rayuela', author: 'Julio Cortázar', isbn: '9788437604572', pages: 736, description: 'Novela', coverUrl: 'https://x/t.jpg' }]);
});

test('subtítulo y varios autores', async () => {
  const { fn } = fakeFetch(volumes({
    title: 'Good Omens',
    subtitle: 'The Nice and Accurate Prophecies',
    authors: ['Terry Pratchett', 'Neil Gaiman'],
  }));
  const [c] = await createGoogleBooksSearch({ fetch: fn })('omens');
  expect(c.title).toBe('Good Omens: The Nice and Accurate Prophecies');
  expect(c.author).toBe('Terry Pratchett, Neil Gaiman');
});

test('ISBN_10 si no hay ISBN_13; null si no hay ninguno', async () => {
  const { fn } = fakeFetch(volumes(
    { ...base, industryIdentifiers: [{ type: 'ISBN_10', identifier: '8437604575' }] },
    { ...base, industryIdentifiers: [{ type: 'OTHER', identifier: 'X' }] },
    { ...base },
  ));
  const res = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(res.map((c) => c.isbn)).toEqual(['8437604575', null, null]);
});

test('pages null si pageCount falta, es 0 o no es entero', async () => {
  const { fn } = fakeFetch(volumes({ ...base }, { ...base, pageCount: 0 }, { ...base, pageCount: 12.5 }));
  const res = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(res.map((c) => c.pages)).toEqual([null, null, null]);
});

test('description null si falta', async () => {
  const { fn } = fakeFetch(volumes({ ...base }));
  const [c] = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(c.description).toBeNull();
});

test('descarta ítems sin title, sin authors, con authors vacío o sin volumeInfo', async () => {
  const body = {
    kind: 'books#volumes',
    totalItems: 5,
    items: [
      { id: '1', volumeInfo: { authors: ['A'] } },
      { id: '2', volumeInfo: { title: 'T' } },
      { id: '3', volumeInfo: { title: 'T', authors: [] } },
      { id: '4' },
      { id: '5', volumeInfo: { ...base } },
    ],
  };
  const { fn } = fakeFetch(body);
  const res = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(res).toHaveLength(1);
  expect(res[0].title).toBe('T');
});

test('sin items → []', async () => {
  const { fn } = fakeFetch({ kind: 'books#volumes', totalItems: 0 });
  expect(await createGoogleBooksSearch({ fetch: fn })('x')).toEqual([]);
});

test('arma la URL con q codificado y sin key', async () => {
  const { fn, calls } = fakeFetch(volumes());
  await createGoogleBooksSearch({ fetch: fn })('harry & potter');
  expect(calls[0].startsWith('https://www.googleapis.com/books/v1/volumes?')).toBe(true);
  const params = new URL(calls[0]).searchParams;
  expect(params.get('q')).toBe('harry & potter');
  expect(params.get('maxResults')).toBe('10');
  expect(params.get('printType')).toBe('books');
  expect(params.has('key')).toBe(false);
});

test('agrega key si está configurada', async () => {
  const { fn, calls } = fakeFetch(volumes());
  await createGoogleBooksSearch({ fetch: fn, apiKey: 'K123' })('x');
  expect(new URL(calls[0]).searchParams.get('key')).toBe('K123');
});

const upstream = { status: 502, code: 'UPSTREAM_ERROR', message: 'No se pudo consultar Google Books' };

test('no-2xx → HttpError 502 UPSTREAM_ERROR', async () => {
  const { fn } = fakeFetch({}, { status: 500 });
  await expect(createGoogleBooksSearch({ fetch: fn })('x')).rejects.toMatchObject(upstream);
});

test('JSON inválido → 502', async () => {
  const fn = vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
  await expect(createGoogleBooksSearch({ fetch: fn })('x')).rejects.toMatchObject(upstream);
});

test('error de red → 502', async () => {
  const fn = vi.fn(async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch;
  await expect(createGoogleBooksSearch({ fetch: fn })('x')).rejects.toMatchObject(upstream);
});

test('timeout → 502', async () => {
  const fn = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'TimeoutError')));
    })) as unknown as typeof fetch;
  await expect(createGoogleBooksSearch({ fetch: fn, timeoutMs: 20 })('x')).rejects.toMatchObject(upstream);
});

test('el error no incluye la key ni la URL', async () => {
  const fn = vi.fn(async (url: string | URL | Request) => {
    throw new TypeError(`fetch failed ${String(url)}`);
  }) as unknown as typeof fetch;
  const err = await createGoogleBooksSearch({ fetch: fn, apiKey: 'K123' })('x').catch((e: Error) => e);
  expect((err as Error).message).not.toContain('K123');
  expect((err as Error).message).not.toContain('googleapis');
});

test('usa smallThumbnail si no hay thumbnail', async () => {
  const { fn } = fakeFetch(volumes({ ...base, imageLinks: { smallThumbnail: 'https://x/s.jpg' } }));
  const [c] = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(c.coverUrl).toBe('https://x/s.jpg');
});

test('pasa http a https y conserva la query', async () => {
  const thumbnail = 'http://books.google.com/books/content?id=X&printsec=frontcover&img=1&zoom=1';
  const { fn } = fakeFetch(volumes({ ...base, imageLinks: { thumbnail } }));
  const [c] = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(c.coverUrl).toBe('https://books.google.com/books/content?id=X&printsec=frontcover&img=1&zoom=1');
});

test('sin imageLinks → coverUrl null', async () => {
  const { fn } = fakeFetch(volumes(base));
  const [c] = await createGoogleBooksSearch({ fetch: fn })('x');
  expect(c.coverUrl).toBeNull();
});
