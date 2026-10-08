import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const db = openDb(process.env.DB_PATH ?? 'data/scriptorium.db');
createApp(db).listen(port, () => console.log(`Scriptorium API en http://localhost:${port}`));
