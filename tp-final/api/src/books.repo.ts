import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export type Status = 'to-read' | 'reading' | 'read' | 'borrowed' | 'not-interested';
export type Sort = 'newest' | 'oldest' | 'title' | 'author';
export interface Book {
  id: string; title: string; author: string; isbn: string | null; pages: number | null;
  description: string | null; status: Status; pagesRead: number; createdAt: string; updatedAt: string;
}
export type BookFields = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;

// Mapa fijo: el input del usuario nunca se interpola en el SQL.
const ORDER_BY: Record<Sort, string> = {
  newest: 'createdAt DESC, rowid DESC',
  oldest: 'createdAt ASC, rowid ASC',
  title: 'title COLLATE NOCASE ASC, rowid ASC',
  author: 'author COLLATE NOCASE ASC, rowid ASC',
};

export function createBooksRepo(db: Database.Database) {
  const insert = db.prepare(`INSERT INTO books (id, title, author, isbn, pages, description, status, pagesRead, createdAt, updatedAt)
    VALUES (@id, @title, @author, @isbn, @pages, @description, @status, @pagesRead, @createdAt, @updatedAt)`);
  const updateStmt = db.prepare(`UPDATE books SET title=@title, author=@author, isbn=@isbn, pages=@pages,
    description=@description, status=@status, pagesRead=@pagesRead, updatedAt=@updatedAt WHERE id=@id`);
  const removeStmt = db.prepare('DELETE FROM books WHERE id = ?');
  const byId = db.prepare('SELECT * FROM books WHERE id = ?');

  return {
    list(f: { status?: Status; q?: string; sort: Sort }): Book[] {
      const where: string[] = [];
      const params: string[] = [];
      if (f.status) {
        where.push('status = ?');
        params.push(f.status);
      }
      if (f.q) {
        // Escapa \ primero, luego % y _, para que q se busque como texto literal.
        const like = `%${f.q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
        where.push(`(title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR isbn LIKE ? ESCAPE '\\')`);
        params.push(like, like, like);
      }
      const sql = `SELECT * FROM books${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ${ORDER_BY[f.sort]}`;
      return db.prepare(sql).all(...params) as Book[];
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
    update(id: string, fields: BookFields): Book | undefined {
      const info = updateStmt.run({ ...fields, id, updatedAt: new Date().toISOString() });
      return info.changes ? this.get(id) : undefined;
    },
    remove(id: string): boolean {
      return removeStmt.run(id).changes > 0;
    },
  };
}
