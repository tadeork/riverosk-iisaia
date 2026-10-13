import { HttpError } from '../errors.js';

export interface BookCandidate {
  title: string;
  author: string;
  isbn: string | null;
  pages: number | null;
  description: string | null;
  coverUrl: string | null;
}

export type BookSearch = (q: string) => Promise<BookCandidate[]>;

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nonEmptyString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;

function pickIsbn(identifiers: unknown): string | null {
  if (!Array.isArray(identifiers)) return null;
  const find = (type: string) => {
    for (const id of identifiers) {
      if (isRecord(id) && id.type === type) {
        const value = nonEmptyString(id.identifier);
        if (value) return value;
      }
    }
    return null;
  };
  return find('ISBN_13') ?? find('ISBN_10');
}

function pickCover(imageLinks: unknown): string | null {
  if (!isRecord(imageLinks)) return null;
  const url = nonEmptyString(imageLinks.thumbnail) ?? nonEmptyString(imageLinks.smallThumbnail);
  return url ? url.replace(/^http:\/\//, 'https://') : null;
}

function normalize(item: unknown): BookCandidate | null {
  if (!isRecord(item) || !isRecord(item.volumeInfo)) return null;
  const info = item.volumeInfo;
  const baseTitle = nonEmptyString(info.title);
  if (!baseTitle || !Array.isArray(info.authors)) return null;
  const authors = info.authors.map(nonEmptyString).filter((a): a is string => a !== null);
  if (authors.length === 0) return null;
  const subtitle = nonEmptyString(info.subtitle);
  const pageCount = info.pageCount;
  return {
    title: subtitle ? `${baseTitle}: ${subtitle}` : baseTitle,
    author: authors.join(', '),
    isbn: pickIsbn(info.industryIdentifiers),
    pages: typeof pageCount === 'number' && Number.isInteger(pageCount) && pageCount > 0 ? pageCount : null,
    description: nonEmptyString(info.description),
    coverUrl: pickCover(info.imageLinks),
  };
}

export function createGoogleBooksSearch(
  opts: { apiKey?: string; fetch?: typeof fetch; timeoutMs?: number } = {},
): BookSearch {
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 5000;

  return async (q) => {
    const params = new URLSearchParams({ q, maxResults: '10', printType: 'books' });
    if (opts.apiKey) params.set('key', opts.apiKey);

    let body: unknown;
    try {
      const res = await doFetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      body = await res.json();
    } catch {
      throw new HttpError(502, 'UPSTREAM_ERROR', 'No se pudo consultar Google Books');
    }

    const items = isRecord(body) && Array.isArray(body.items) ? body.items : [];
    return items.map(normalize).filter((c): c is BookCandidate => c !== null);
  };
}
