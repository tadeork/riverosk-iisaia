import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Book } from '../book.model';
import { BookCardComponent } from './book-card';

const BOOK: Book = {
  id: '1',
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: null,
  pages: 500,
  description: null,
  coverUrl: 'https://example.com/dune.jpg',
  status: 'to-read',
  pagesRead: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

@Component({
  imports: [BookCardComponent],
  template: `<app-book-card [book]="book()" />`,
})
class HostComponent {
  book = signal<Book>(BOOK);
}

async function setup(book: Book = BOOK) {
  await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.book.set(book);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance, el };
}

describe('BookCardComponent portada', () => {
  it('con coverUrl muestra la imagen', async () => {
    const { el } = await setup();
    const img = el.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.com/dune.jpg');
    expect(img.alt).toBe('Portada de Dune');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(el.querySelector('.cover-placeholder')).toBeNull();
  });

  it('sin coverUrl muestra el placeholder con la inicial', async () => {
    const { el } = await setup({ ...BOOK, coverUrl: null });
    expect(el.querySelector('img')).toBeNull();
    const placeholder = el.querySelector('.cover-placeholder') as HTMLElement;
    expect(placeholder.textContent?.trim()).toBe('D');
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
  });

  it('si la imagen falla muestra el placeholder', async () => {
    const { fixture, el } = await setup();
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.cover-placeholder')).not.toBeNull();
  });

  it('al cambiar coverUrl vuelve a intentar', async () => {
    const { fixture, host, el } = await setup();
    el.querySelector('img')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    host.book.set({ ...BOOK, coverUrl: 'https://otra/c.jpg' });
    await fixture.whenStable();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://otra/c.jpg');
  });

  it('la inicial ignora espacios y va en mayúscula', async () => {
    const { el } = await setup({ ...BOOK, title: '  ángel', coverUrl: null });
    expect(el.querySelector('.cover-placeholder')?.textContent?.trim()).toBe('Á');
  });
});
