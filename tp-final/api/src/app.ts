import express from 'express';
import type Database from 'better-sqlite3';
import { booksRouter } from './books.routes.js';
import { errorHandler, HttpError } from './errors.js';
import type { BookSearch } from './lookup/google-books.js';
import { lookupRouter } from './lookup/lookup.routes.js';

export function createApp(db: Database.Database, deps: { search: BookSearch }): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/books', booksRouter(db));
  app.use('/api/lookup', lookupRouter(deps.search));
  app.use('/api', (req, _res, next) => {
    next(new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
  });
  app.use(errorHandler);
  return app;
}
