import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

export function makeApp() {
  return request(createApp(openDb(':memory:')));
}
