import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from './app.js';
import { openDb } from './db.js';
import { createGoogleBooksSearch } from './lookup/google-books.js';

const webDir = process.env.WEB_DIR || undefined;
// Mejor no arrancar que quedar "live" en Render con el front devolviendo 500.
if (webDir && !existsSync(join(webDir, 'index.html'))) {
  console.error(`WEB_DIR=${webDir} no tiene index.html: falta el build de Angular.`);
  process.exit(1);
}
const port = Number(process.env.PORT ?? 3000);
const db = openDb(process.env.DB_PATH ?? 'data/scriptorium.db');
const search = createGoogleBooksSearch({ apiKey: process.env.GOOGLE_BOOKS_API_KEY || undefined });
createApp(db, { search, webDir }).listen(port, () => console.log(`Scriptorium API en http://localhost:${port}`));
