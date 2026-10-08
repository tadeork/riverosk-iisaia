import express from 'express';
import type Database from 'better-sqlite3';
import { booksRouter } from './books.routes.js';
import { errorHandler } from './errors.js';

export function createApp(db: Database.Database): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/books', booksRouter(db));
  app.use(errorHandler);
  return app;
}
