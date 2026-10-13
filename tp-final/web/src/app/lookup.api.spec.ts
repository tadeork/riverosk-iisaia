import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LookupApi } from './lookup.api';

describe('LookupApi', () => {
  it('search pide GET /api/lookup con el param q', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(LookupApi);
    const httpTesting = TestBed.inject(HttpTestingController);

    api.search('rayuela cortázar').subscribe();
    const req = httpTesting.expectOne((r) => r.url === '/api/lookup');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('rayuela cortázar');
    req.flush([]);
    httpTesting.verify();
  });
});
