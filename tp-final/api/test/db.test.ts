import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { openDb } from '../src/db.js';

test('crea la tabla books en memoria', () => {
  const db = openDb(':memory:');
  const cols = db.prepare("PRAGMA table_info(books)").all().map((c: any) => c.name);
  expect(cols).toEqual(['id','title','author','isbn','pages','description','status','pagesRead','createdAt','updatedAt']);
});

test('los datos sobreviven a cerrar y reabrir el archivo', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'scr-')), 'test.db');
  const a = openDb(path);
  a.prepare("INSERT INTO books VALUES ('1','T','A',NULL,NULL,NULL,'to-read',0,'x','x')").run();
  a.close();
  expect(openDb(path).prepare('SELECT title FROM books').get()).toEqual({ title: 'T' });
});
