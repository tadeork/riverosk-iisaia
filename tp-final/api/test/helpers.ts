import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import type { BookSearch } from '../src/lookup/google-books.js';

export function makeApp(search: BookSearch = async () => []) {
  return request(createApp(openDb(':memory:'), { search }));
}
