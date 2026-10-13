import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDb(path: string): Database.Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.exec(`CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    pages INTEGER,
    description TEXT,
    status TEXT NOT NULL,
    pagesRead INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    coverUrl TEXT
  )`);
  // Migración idempotente para bases creadas antes de coverUrl.
  const columns = db.prepare('PRAGMA table_info(books)').all() as { name: string }[];
  if (!columns.some((c) => c.name === 'coverUrl')) db.exec('ALTER TABLE books ADD COLUMN coverUrl TEXT');
  return db;
}
