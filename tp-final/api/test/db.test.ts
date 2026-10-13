import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import Database from 'better-sqlite3';
import { openDb } from '../src/db.js';

test('crea la tabla books en memoria', () => {
  const db = openDb(':memory:');
  const cols = db.prepare("PRAGMA table_info(books)").all().map((c: any) => c.name);
  expect(cols).toEqual(['id','title','author','isbn','pages','description','status','pagesRead','createdAt','updatedAt','coverUrl']);
});

test('los datos sobreviven a cerrar y reabrir el archivo', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'scr-')), 'test.db');
  const a = openDb(path);
  a.prepare("INSERT INTO books (id, title, author, status, createdAt, updatedAt) VALUES ('1','T','A','to-read','x','x')").run();
  a.close();
  expect(openDb(path).prepare('SELECT title FROM books').get()).toEqual({ title: 'T' });
});

const OLD_SCHEMA = `CREATE TABLE books (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, isbn TEXT, pages INTEGER,
  description TEXT, status TEXT NOT NULL, pagesRead INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)`;

test('migra una base vieja sin coverUrl conservando las filas', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'scr-')), 'old.db');
  const old = new Database(path);
  old.exec(OLD_SCHEMA);
  old.prepare("INSERT INTO books VALUES ('1','T','A',NULL,NULL,NULL,'to-read',0,'x','x')").run();
  old.close();
  const db = openDb(path);
  expect(db.prepare('SELECT coverUrl, title FROM books').get()).toEqual({ coverUrl: null, title: 'T' });
});

test('abrir dos veces una base ya migrada no falla', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'scr-')), 'twice.db');
  openDb(path).close();
  expect(() => openDb(path).close()).not.toThrow();
});
