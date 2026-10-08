export type Status = 'to-read' | 'reading' | 'read' | 'borrowed' | 'not-interested';
export type Sort = 'newest' | 'oldest' | 'title' | 'author';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  pages: number | null;
  description: string | null;
  status: Status;
  pagesRead: number;
  createdAt: string;
  updatedAt: string;
}

export type BookInput = Partial<
  Pick<Book, 'title' | 'author' | 'isbn' | 'pages' | 'description' | 'status' | 'pagesRead'>
>;

export const STATUS_LABELS: Record<Status, string> = {
  'to-read': 'Por leer',
  reading: 'Leyendo',
  read: 'Leído',
  borrowed: 'Prestado',
  'not-interested': 'No voy a leer',
};
