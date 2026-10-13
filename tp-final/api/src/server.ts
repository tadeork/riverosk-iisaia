import { createApp } from './app.js';
import { openDb } from './db.js';
import { createGoogleBooksSearch } from './lookup/google-books.js';

const port = Number(process.env.PORT ?? 3000);
const db = openDb(process.env.DB_PATH ?? 'data/scriptorium.db');
const search = createGoogleBooksSearch({ apiKey: process.env.GOOGLE_BOOKS_API_KEY || undefined });
createApp(db, { search }).listen(port, () => console.log(`Scriptorium API en http://localhost:${port}`));
