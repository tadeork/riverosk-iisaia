import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BooksApi } from './books.api';

describe('BooksApi', () => {
  let api: BooksApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(BooksApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('list sin filtros pide GET /api/books sin params', () => {
    api.list({}).subscribe();
    const req = httpTesting.expectOne('/api/books');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('list omite params vacíos y manda los definidos', () => {
    api.list({ status: 'reading', q: '', sort: 'title' }).subscribe();
    const req = httpTesting.expectOne((r) => r.url === '/api/books');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['sort', 'status']);
    expect(req.request.params.get('status')).toBe('reading');
    expect(req.request.params.get('sort')).toBe('title');
    expect(req.request.urlWithParams).toBe('/api/books?status=reading&sort=title');
    req.flush([]);
  });

  it('create hace POST /api/books con el body', () => {
    api.create({ title: 'Dune', author: 'Herbert' }).subscribe();
    const req = httpTesting.expectOne('/api/books');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Dune', author: 'Herbert' });
    req.flush({});
  });

  it('update hace PATCH /api/books/:id con el body', () => {
    api.update('abc', { status: 'read' }).subscribe();
    const req = httpTesting.expectOne('/api/books/abc');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'read' });
    req.flush({});
  });

  it('remove hace DELETE /api/books/:id', () => {
    api.remove('abc').subscribe();
    const req = httpTesting.expectOne('/api/books/abc');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
