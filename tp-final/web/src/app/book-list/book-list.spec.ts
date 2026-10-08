import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Book } from '../book.model';
import { BookListComponent } from './book-list';

const book = (over: Partial<Book>): Book => ({
  id: '1',
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: null,
  pages: 500,
  description: null,
  status: 'reading',
  pagesRead: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

async function setup() {
  vi.useFakeTimers();
  await TestBed.configureTestingModule({
    imports: [BookListComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookListComponent);
  const httpTesting = TestBed.inject(HttpTestingController);
  const el = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();
  return { fixture, httpTesting, el };
}

describe('BookListComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('al iniciar pide /api/books y renderiza una card por libro', async () => {
    const { fixture, httpTesting, el } = await setup();
    httpTesting
      .expectOne('/api/books?sort=newest')
      .flush([book({ id: '1', title: 'Dune' }), book({ id: '2', title: 'Emma' })]);
    fixture.detectChanges();

    const cards = el.querySelectorAll('app-book-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Dune');
    expect(cards[1].textContent).toContain('Emma');
    httpTesting.verify();
  });

  it('una respuesta vieja que llega tarde no pisa la última búsqueda', async () => {
    const { fixture, httpTesting, el } = await setup();
    httpTesting.expectOne('/api/books?sort=newest').flush([]);
    const search = el.querySelector('input[type="search"]') as HTMLInputElement;

    search.value = 'a';
    search.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    const req1 = httpTesting.expectOne('/api/books?q=a&sort=newest');

    search.value = 'ab';
    search.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    const req2 = httpTesting.expectOne('/api/books?q=ab&sort=newest');

    expect(req1.cancelled).toBe(true);
    req2.flush([book({ id: '2', title: 'Abismo' })]);
    fixture.detectChanges();

    const cards = el.querySelectorAll('app-book-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Abismo');
    httpTesting.verify();
  });

  it('progressChange manda PATCH {pagesRead} y reemplaza la card con la respuesta', async () => {
    const { fixture, httpTesting, el } = await setup();
    httpTesting.expectOne('/api/books?sort=newest').flush([book({ pagesRead: 100 })]);
    fixture.detectChanges();

    (el.querySelector('button[aria-label="Sumar una página"]') as HTMLButtonElement).click();
    const req = httpTesting.expectOne('/api/books/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ pagesRead: 101 });
    req.flush(book({ pagesRead: 101 }));
    fixture.detectChanges();

    expect(el.querySelector('.summary')?.textContent).toContain('101 / 500');
    httpTesting.verify();
  });

  it('si el PATCH de progreso falla, la card conserva el valor anterior y se muestra el error', async () => {
    const { fixture, httpTesting, el } = await setup();
    httpTesting.expectOne('/api/books?sort=newest').flush([book({ pagesRead: 100 })]);
    fixture.detectChanges();

    (el.querySelector('button[aria-label="Sumar una página"]') as HTMLButtonElement).click();
    httpTesting
      .expectOne('/api/books/1')
      .flush(
        { error: { code: 'internal', message: 'Falló el servidor' } },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    expect(el.querySelector('.summary')?.textContent).toContain('100 / 500');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Falló el servidor');
    httpTesting.verify();
  });

  it('error de red al listar muestra "Sin conexión con el servidor"', async () => {
    const { fixture, httpTesting, el } = await setup();
    httpTesting.expectOne('/api/books?sort=newest').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Sin conexión con el servidor',
    );
    httpTesting.verify();
  });
});
