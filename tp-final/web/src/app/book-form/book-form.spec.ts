import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Book, BookInput } from '../book.model';
import { BookFormComponent } from './book-form';

@Component({
  imports: [BookFormComponent],
  template: `<app-book-form
    [book]="book()"
    [serverErrors]="serverErrors()"
    (save)="saved.push($event)"
    (cancelled)="cancels = cancels + 1"
  />`,
})
class HostComponent {
  book = signal<Book | null>(null);
  serverErrors = signal<Record<string, string> | null>(null);
  saved: BookInput[] = [];
  cancels = 0;
}

const BOOK: Book = {
  id: '1',
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: null,
  pages: 500,
  description: 'Arrakis',
  status: 'reading',
  pagesRead: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function setup() {
  await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const input = (name: string) => el.querySelector(`[name="${name}"]`) as HTMLInputElement;
  const type = async (name: string, value: string) => {
    const field = input(name);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async () => {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  const submitButton = () => el.querySelector('button[type="submit"]') as HTMLButtonElement;
  return { fixture, el, host: fixture.componentInstance, input, type, submit, submitButton };
}

describe('BookFormComponent', () => {
  it('no emite save si title o author están vacíos o con solo espacios', async () => {
    const { el, host, type, submit } = await setup();
    await submit();
    expect(host.saved).toEqual([]);
    expect(el.textContent).toContain('El título es obligatorio');
    expect(el.textContent).toContain('El autor es obligatorio');

    await type('title', '   ');
    await type('author', 'Alguien');
    await submit();
    expect(host.saved).toEqual([]);

    await type('title', 'Algo');
    await type('author', '   ');
    await submit();
    expect(host.saved).toEqual([]);
  });

  it('emite save con los valores, sin espacios a los costados y opcionales vacíos como null', async () => {
    const { host, type, submit } = await setup();
    await type('title', '  Dune  ');
    await type('author', ' Frank Herbert ');
    await submit();
    expect(host.saved).toEqual([
      {
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: null,
        description: null,
        pages: null,
        status: 'to-read',
      },
    ]);

    await type('isbn', '123');
    await type('pages', '320');
    await type('description', '  Una novela  ');
    await submit();
    expect(host.saved[1]).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '123',
      description: 'Una novela',
      pages: 320,
      status: 'to-read',
    });
  });

  it('en edición precarga los valores del book y el botón dice "Guardar cambios"', async () => {
    const { fixture, host, input, submitButton } = await setup();
    expect(submitButton().textContent).toContain('Agregar libro');
    host.book.set(BOOK);
    await fixture.whenStable();
    expect(input('title').value).toBe('Dune');
    expect(input('author').value).toBe('Frank Herbert');
    expect(input('isbn').value).toBe('');
    expect(input('pages').value).toBe('500');
    expect(input('description').value).toBe('Arrakis');
    expect((fixture.nativeElement as HTMLElement).querySelector('select')!.value).toBe('reading');
    expect(submitButton().textContent).toContain('Guardar cambios');
  });

  it('muestra serverErrors.pages debajo del input pages', async () => {
    const { fixture, el, host } = await setup();
    host.serverErrors.set({ pages: 'pages debe ser mayor a 0', pagesRead: 'fuera de rango' });
    await fixture.whenStable();
    const field = el.querySelector('[name="pages"]')!.closest('.field')!;
    expect(field.textContent).toContain('pages debe ser mayor a 0');
    expect(el.textContent).toContain('fuera de rango');
  });

  it('cancelar emite cancelled sin enviar el formulario', async () => {
    const { el, host } = await setup();
    (el.querySelector('button.cancel') as HTMLButtonElement).click();
    expect(host.cancels).toBe(1);
    expect(host.saved).toEqual([]);
  });
});
