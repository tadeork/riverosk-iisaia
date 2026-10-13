import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BookCandidate } from './book.model';

const BASE_URL = '/api/lookup';

@Injectable({ providedIn: 'root' })
export class LookupApi {
  private readonly http = inject(HttpClient);

  search(q: string): Observable<BookCandidate[]> {
    return this.http.get<BookCandidate[]>(BASE_URL, { params: new HttpParams().set('q', q) });
  }
}
