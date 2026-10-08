import { Router } from 'express';
import type Database from 'better-sqlite3';
import { createBooksRepo, type BookFields } from './books.repo.js';
import { bookCreateSchema, bookPatchSchema, listQuerySchema, type BookInput } from './books.schema.js';
import { HttpError } from './errors.js';

const DEFAULTS: BookFields = {
  title: '', author: '', isbn: null, pages: null, description: null, status: 'to-read', pagesRead: 0,
};

// Único lugar con reglas de negocio (reglas 1-3). Lo reutiliza PATCH.
function resolve(current: BookFields | null, input: BookInput): BookFields {
  const merged: BookFields = { ...(current ?? DEFAULTS) };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
  }
  const { pages, pagesRead } = merged;
  // Regla 4: si el cambio fue en pages (sin pagesRead), el error se atribuye a pages.
  const field = input.pages !== undefined && input.pagesRead === undefined ? 'pages' : 'pagesRead';
  if (pages === null && pagesRead !== 0) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Validation failed', { [field]: 'pagesRead must be 0 when pages is not set' });
  }
  if (pages !== null && pagesRead > pages) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Validation failed', { [field]: 'pagesRead must be ≤ pages' });
  }
  if (merged.status === 'read' && pages !== null) merged.pagesRead = pages;
  return merged;
}

export function booksRouter(db: Database.Database): Router {
  const repo = createBooksRepo(db);
  const router = Router();

  router.get('/', (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'BAD_REQUEST', 'Invalid query parameters');
    res.json(repo.list(parsed.data));
  });

  router.get('/:id', (req, res) => {
    const book = repo.get(req.params.id);
    if (!book) throw new HttpError(404, 'NOT_FOUND', 'Book not found');
    res.json(book);
  });

  router.post('/', (req, res) => {
    const input = bookCreateSchema.parse(req.body ?? {});
    const book = repo.create(resolve(null, input));
    res.status(201).location(`/api/books/${book.id}`).json(book);
  });

  router.patch('/:id', (req, res) => {
    const current = repo.get(req.params.id);
    if (!current) throw new HttpError(404, 'NOT_FOUND', 'Book not found');
    const input = bookPatchSchema.parse(req.body ?? {});
    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = current;
    res.json(repo.update(current.id, resolve(fields, input)));
  });

  router.delete('/:id', (req, res) => {
    if (!repo.remove(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Book not found');
    res.status(204).end();
  });

  return router;
}
