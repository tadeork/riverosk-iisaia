import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Camera } from '../camera';
import { CoverOcr } from '../cover-ocr';
import { CoverScannerComponent } from '../cover-scanner/cover-scanner';
import { BookCandidate } from '../book.model';
import { BookLookupComponent } from './book-lookup';

const RAYUELA: BookCandidate = {
  title: 'Rayuela',
  author: 'Julio Cortázar',
  isbn: '9780394752846',
  pages: 736,
  description: null,
  coverUrl: null,
};

async function setup() {
  await TestBed.configureTestingModule({
    imports: [BookLookupComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      // Cámara y OCR que nunca responden: el scanner se muestra pero no lee solo.
      { provide: Camera, useValue: { open: () => new Promise(() => {}) } },
      { provide: CoverOcr, useValue: { read: () => new Promise(() => {}) } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BookLookupComponent);
  const httpTesting = TestBed.inject(HttpTestingController);
  const el = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();
  const input = el.querySelector('#lookup-q') as HTMLInputElement;
  const button = () =>
    Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Buscar',
    ) as HTMLButtonElement;
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const search = (value: string) => {
    type(value);
    button().click();
    fixture.detectChanges();
  };
  const candidates = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button.candidate'));
  const scanButton = () => el.querySelector('button.scan') as HTMLButtonElement;
  const scanner = () => fixture.debugElement.query(By.directive(CoverScannerComponent));
  const scan = (text: string) => {
    (scanner().componentInstance as CoverScannerComponent).text.emit(text);
    fixture.detectChanges();
  };
  return { fixture, httpTesting, el, input, button, type, search, candidates, scanButton, scanner, scan };
}

const lookupReq = (h: HttpTestingController, q: string) =>
  h.expectOne((r) => r.url === '/api/lookup' && r.params.get('q') === q);

describe('BookLookupComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('tiene el label Buscar en Google Books asociado al input', async () => {
    const { el } = await setup();
    expect(el.querySelector('label[for="lookup-q"]')?.textContent?.trim()).toBe(
      'Buscar en Google Books',
    );
  });

  it('el input limita el texto a 200 caracteres', async () => {
    const { input } = await setup();
    expect(input.maxLength).toBe(200);
  });

  it('el botón está deshabilitado con el input vacío o con solo espacios', async () => {
    const { button, type } = await setup();
    expect(button().disabled).toBe(true);
    type('   ');
    expect(button().disabled).toBe(true);
    type('rayuela');
    expect(button().disabled).toBe(false);
  });

  it('buscar con el botón pide /api/lookup?q= con el texto recortado y muestra Buscando…', async () => {
    const { httpTesting, el, search } = await setup();
    search('  rayuela ');
    lookupReq(httpTesting, 'rayuela');
    expect(el.textContent).toContain('Buscando…');
    expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe('Buscando…');
  });

  it('Enter en el input busca', async () => {
    const { httpTesting, input, type, fixture } = await setup();
    type('rayuela');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    lookupReq(httpTesting, 'rayuela');
  });

  it('el botón está deshabilitado mientras carga', async () => {
    const { httpTesting, button, search } = await setup();
    search('rayuela');
    expect(button().disabled).toBe(true);
    lookupReq(httpTesting, 'rayuela');
  });

  it('renderiza un botón por candidato', async () => {
    const { httpTesting, fixture, search, candidates } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush([RAYUELA, { ...RAYUELA, pages: null }]);
    fixture.detectChanges();
    const items = candidates();
    expect(items.length).toBe(2);
    expect(items[0].textContent?.trim()).toBe('Rayuela — Julio Cortázar · 736 págs.');
    expect(items[1].textContent?.trim()).toBe('Rayuela — Julio Cortázar');
    expect(items[1].textContent).not.toContain('págs.');
  });

  it('un candidato con coverUrl muestra la miniatura', async () => {
    const { httpTesting, fixture, search, candidates } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush([{ ...RAYUELA, coverUrl: 'https://x/t.jpg' }]);
    fixture.detectChanges();
    const img = candidates()[0].querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://x/t.jpg');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(candidates()[0].textContent?.trim()).toBe('Rayuela — Julio Cortázar · 736 págs.');
  });

  it('si la miniatura falla muestra el hueco en lugar de la imagen rota', async () => {
    const { httpTesting, fixture, search, candidates } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush([{ ...RAYUELA, coverUrl: 'https://x/rota.jpg' }, { ...RAYUELA, coverUrl: 'https://x/ok.jpg' }]);
    fixture.detectChanges();
    candidates()[0].querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(candidates()[0].querySelector('img')).toBeNull();
    expect(candidates()[0].querySelector('.thumb-empty')).not.toBeNull();
    expect(candidates()[1].querySelector('img')?.getAttribute('src')).toBe('https://x/ok.jpg');
  });

  it('sin coverUrl no hay img pero sí el hueco', async () => {
    const { httpTesting, fixture, search, candidates } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush([RAYUELA]);
    fixture.detectChanges();
    expect(candidates()[0].querySelector('img')).toBeNull();
    expect(candidates()[0].querySelector('.thumb-empty')).not.toBeNull();
  });

  it('sin resultados muestra No se encontraron libros.', async () => {
    const { httpTesting, fixture, el, search } = await setup();
    search('zzz');
    lookupReq(httpTesting, 'zzz').flush([]);
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      'No se encontraron libros.',
    );
  });

  it('un 502 muestra el mensaje de Google', async () => {
    const { httpTesting, fixture, el, search } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush(
      { error: { code: 'UPSTREAM_ERROR', message: 'x' } },
      { status: 502, statusText: 'Bad Gateway' },
    );
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo consultar Google Books. Probá de nuevo o cargalo a mano.',
    );
  });

  it('offline (status 0) muestra Sin conexión con el servidor', async () => {
    const { httpTesting, fixture, el, search } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Sin conexión con el servidor',
    );
  });

  it('click en un resultado emite picked con ese candidato, colapsa la lista y muestra el aviso', async () => {
    const { httpTesting, fixture, el, search, candidates } = await setup();
    const picked: BookCandidate[] = [];
    fixture.componentInstance.picked.subscribe((c) => picked.push(c));
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush([RAYUELA]);
    fixture.detectChanges();
    candidates()[0].click();
    fixture.detectChanges();
    expect(picked).toEqual([RAYUELA]);
    expect(candidates().length).toBe(0);
    const notice = el.querySelector('[role="status"]');
    expect(notice?.textContent).toContain(
      'Datos cargados desde Google Books: revisalos antes de guardar.',
    );
    expect(document.activeElement).toBe(notice);
  });

  it('una búsqueda nueva cancela la anterior', async () => {
    const { httpTesting, fixture, search, candidates } = await setup();
    search('a');
    const first = lookupReq(httpTesting, 'a');
    // el botón se deshabilita mientras carga; Enter permite lanzar otra búsqueda
    const input = fixture.nativeElement.querySelector('#lookup-q') as HTMLInputElement;
    input.value = 'b';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(first.cancelled).toBe(true);
    lookupReq(httpTesting, 'b').flush([{ ...RAYUELA, title: 'B' }]);
    fixture.detectChanges();
    expect(candidates().map((c) => c.textContent?.trim())).toEqual(['B — Julio Cortázar · 736 págs.']);
  });

  it('buscar de nuevo después de elegir oculta el aviso y muestra los resultados nuevos', async () => {
    const { httpTesting, fixture, el, search, candidates } = await setup();
    search('rayuela');
    lookupReq(httpTesting, 'rayuela').flush([RAYUELA]);
    fixture.detectChanges();
    candidates()[0].click();
    fixture.detectChanges();
    search('otro');
    lookupReq(httpTesting, 'otro').flush([{ ...RAYUELA, title: 'Otro' }]);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Datos cargados desde Google Books');
    expect(candidates().length).toBe(1);
    expect(candidates()[0].textContent).toContain('Otro');
  });

  describe('escanear la tapa', () => {
    it('Escanear tapa va debajo de la fila del buscador, no al lado de Buscar', async () => {
      const { el, scanButton } = await setup();
      expect(el.querySelector('.row .scan')).toBeNull();
      expect(scanButton().previousElementSibling?.classList.contains('row')).toBe(true);
    });

    it('Escanear tapa muestra el scanner y Cerrar cámara lo saca', async () => {
      const { fixture, scanButton, scanner } = await setup();
      expect(scanButton().textContent?.trim()).toBe('Escanear tapa');
      expect(scanner()).toBeNull();
      scanButton().click();
      fixture.detectChanges();
      expect(scanner()).not.toBeNull();
      expect(scanButton().textContent?.trim()).toBe('Cerrar cámara');
      scanButton().click();
      fixture.detectChanges();
      expect(scanner()).toBeNull();
      expect(scanButton().textContent?.trim()).toBe('Escanear tapa');
    });

    it('el texto del scanner, limpio, reemplaza la consulta', async () => {
      const { fixture, input, scanButton, scan } = await setup();
      scanButton().click();
      fixture.detectChanges();
      scan('  Rayuela\n\nJulio   Cortázar ');
      expect(input.value).toBe('Rayuela Julio Cortázar');
    });

    it('el texto se corta en 200 caracteres', async () => {
      const { fixture, input, scanButton, scan } = await setup();
      scanButton().click();
      fixture.detectChanges();
      scan('a'.repeat(250));
      expect(input.value.length).toBe(200);
    });

    it('el texto vacío o de solo espacios no cambia la consulta', async () => {
      const { fixture, input, type, scanButton, scan } = await setup();
      type('rayuela');
      scanButton().click();
      fixture.detectChanges();
      scan(' \n ');
      expect(input.value).toBe('rayuela');
    });

    it('Buscar cierra la cámara y busca el texto escaneado', async () => {
      const { fixture, httpTesting, button, scanButton, scanner, scan } = await setup();
      scanButton().click();
      fixture.detectChanges();
      scan('Rayuela');
      button().click();
      fixture.detectChanges();
      expect(scanner()).toBeNull();
      lookupReq(httpTesting, 'Rayuela').flush([]);
    });
  });
});
