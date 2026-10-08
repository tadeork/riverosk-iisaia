import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export type Status = 'to-read' | 'reading' | 'read' | 'borrowed' | 'not-interested';
export type Sort = 'newest' | 'oldest' | 'title' | 'author';
export interface Book {
  id: string; title: string; author: string; isbn: string | null; pages: number | null;
  description: string | null; status: Status; pagesRead: number; createdAt: string; updatedAt: string;
}
export type BookFields = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;

export function createBooksRepo(db: Database.Database) {
  const insert = db.prepare(`INSERT INTO books (id, title, author, isbn, pages, description, status, pagesRead, createdAt, updatedAt)
    VALUES (@id, @title, @author, @isbn, @pages, @description, @status, @pagesRead, @createdAt, @updatedAt)`);
  const byId = db.prepare('SELECT * FROM books WHERE id = ?');

  return {
    // Task 3 agrega filtros y orden; por ahora devuelve todo, el más nuevo primero.
    list(_f: { status?: Status; q?: string; sort: Sort }): Book[] {
      return db.prepare('SELECT * FROM books ORDER BY createdAt DESC, rowid DESC').all() as Book[];
    },
    get(id: string): Book | undefined {
      return byId.get(id) as Book | undefined;
    },
    create(fields: BookFields): Book {
      const now = new Date().toISOString();
      const book: Book = { id: randomUUID(), ...fields, createdAt: now, updatedAt: now };
      insert.run(book);
      return book;
    },
    update(_id: string, _fields: BookFields): Book | undefined {
      throw new Error('not implemented (Task 4)');
    },
    remove(_id: string): boolean {
      throw new Error('not implemented (Task 4)');
    },
  };
}
