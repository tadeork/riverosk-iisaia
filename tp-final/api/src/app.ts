import express from 'express';
import { resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { booksRouter } from './books.routes.js';
import { errorHandler, HttpError } from './errors.js';
import type { BookSearch } from './lookup/google-books.js';
import { lookupRouter } from './lookup/lookup.routes.js';

export function createApp(db: Database.Database, deps: { search: BookSearch; webDir?: string }): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/books', booksRouter(db));
  app.use('/api/lookup', lookupRouter(deps.search));
  app.use('/api', (req, _res, next) => {
    next(new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
  });
  // En producción la API también sirve el build de Angular. Va después del 404 de /api,
  // así una ruta de la API que no existe nunca devuelve el index.html.
  if (deps.webDir) {
    // sendFile exige una ruta absoluta; en Render WEB_DIR es relativa a api/.
    const webDir = resolve(deps.webDir);
    app.use(express.static(webDir));
    // Cualquier otra ruta GET (recargar la página en una URL del front) devuelve la app.
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(webDir, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
