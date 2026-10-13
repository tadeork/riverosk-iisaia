import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../errors.js';
import type { BookSearch } from './google-books.js';

const lookupQuerySchema = z.object({ q: z.string().trim().min(1).max(200) });

export function lookupRouter(search: BookSearch): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const parsed = lookupQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'BAD_REQUEST', 'Invalid query parameters');
    res.json(await search(parsed.data.q));
  });

  return router;
}
