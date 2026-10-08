import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Book, BookInput, Sort, Status } from './book.model';

const BASE_URL = '/api/books';

@Injectable({ providedIn: 'root' })
export class BooksApi {
  private readonly http = inject(HttpClient);

  list(p: { status?: Status; q?: string; sort?: Sort }): Observable<Book[]> {
    let params = new HttpParams();
    if (p.status) params = params.set('status', p.status);
    if (p.q) params = params.set('q', p.q);
    if (p.sort) params = params.set('sort', p.sort);
    return this.http.get<Book[]>(BASE_URL, { params });
  }

  create(i: BookInput): Observable<Book> {
    return this.http.post<Book>(BASE_URL, i);
  }

  update(id: string, p: BookInput): Observable<Book> {
    return this.http.patch<Book>(`${BASE_URL}/${id}`, p);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${id}`);
  }
}
