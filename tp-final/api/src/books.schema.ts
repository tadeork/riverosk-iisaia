import { z } from 'zod';

export const statusSchema = z.enum(['to-read', 'reading', 'read', 'borrowed', 'not-interested']);

// Objetos no estrictos: id/createdAt/updatedAt del body se descartan (regla 5).
export const bookCreateSchema = z.object({
  title: z.string().trim().min(1),
  author: z.string().trim().min(1),
  isbn: z.string().nullable().optional(),
  pages: z.number().int().min(1).nullable().optional(),
  description: z.string().nullable().optional(),
  status: statusSchema.optional(),
  pagesRead: z.number().int().min(0).optional(),
});

export const bookPatchSchema = bookCreateSchema.partial();

export const listQuerySchema = z.object({
  status: statusSchema.optional(),
  q: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'title', 'author']).default('newest'),
});

export type BookInput = z.infer<typeof bookPatchSchema>;
