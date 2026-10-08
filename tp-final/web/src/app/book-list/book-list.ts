import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, debounceTime, EMPTY, merge, startWith, Subject, switchMap } from 'rxjs';
import { toUiError, UiError } from '../api-error';
import { Book, BookInput, Sort, Status } from '../book.model';
import { BookCardComponent } from '../book-card/book-card';
import { BookFormComponent } from '../book-form/book-form';
import { BooksApi } from '../books.api';
import { ModalOverlayComponent } from '../modal-overlay/modal-overlay';
import { StatusSelectorComponent } from '../status-selector/status-selector';

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Más nuevos' },
  { value: 'oldest', label: 'Más viejos' },
  { value: 'title', label: 'Título (A-Z)' },
  { value: 'author', label: 'Autor (A-Z)' },
];

@Component({
  selector: 'app-book-list',
  imports: [BookCardComponent, BookFormComponent, ModalOverlayComponent, StatusSelectorComponent],
  styleUrl: './book-list.scss',
  template: `
    <div class="toolbar">
      <input
        type="search"
        placeholder="Buscar por título, autor o ISBN"
        aria-label="Buscar"
        [value]="q()"
        (input)="onSearch($event)"
      />
      <app-status-selector
        label="Filtrar por estado"
        [allowAll]="true"
        [status]="status()"
        (statusChange)="onStatusFilter($event)"
      />
      <div class="sort">
        <label for="sort-select">Orden</label>
        <select id="sort-select" [value]="sort()" (change)="onSort($event)">
          @for (opt of sortOptions; track opt.value) {
            <option [value]="opt.value" [selected]="opt.value === sort()">{{ opt.label }}</option>
          }
        </select>
      </div>
      <button type="button" class="add" (click)="openCreate()">+ Agregar</button>
    </div>

    @if (errorMessage(); as message) {
      <div class="banner" role="alert">
        <span>{{ message }}</span>
        <button type="button" aria-label="Cerrar aviso" (click)="error.set(null)">×</button>
      </div>
    }

    @if (books().length === 0 && !error()) {
      <p class="empty">
        {{ status() || q() ? 'Ningún libro coincide con el filtro.' : 'No hay libros todavía.' }}
      </p>
    }

    <div class="grid">
      @for (b of books(); track b.id) {
        <app-book-card
          [book]="b"
          (edit)="openEdit($event)"
          (remove)="onRemove($event)"
          (statusChange)="patch(b, { status: $event })"
          (progressChange)="patch(b, { pagesRead: $event })"
        />
      }
    </div>

    <app-modal-overlay
      [open]="editing() !== undefined"
      [title]="editing() ? 'Editar libro' : 'Agregar libro'"
      (closed)="closeModal()"
    >
      @if (editing() !== undefined) {
        <app-book-form
          [book]="editing() ?? null"
          [serverErrors]="formErrors()"
          (save)="onSave($event)"
          (cancelled)="closeModal()"
        />
      }
    </app-modal-overlay>
  `,
})
export class BookListComponent {
  private readonly api = inject(BooksApi);

  protected readonly sortOptions = SORT_OPTIONS;
  readonly books = signal<Book[]>([]);
  readonly status = signal<Status | ''>('');
  readonly q = signal('');
  readonly sort = signal<Sort>('newest');
  readonly error = signal<UiError | null>(null);
  /** undefined = modal cerrado, null = alta, Book = edición */
  readonly editing = signal<Book | null | undefined>(undefined);
  readonly formErrors = signal<Record<string, string> | null>(null);

  private readonly reload$ = new Subject<void>();
  private readonly search$ = new Subject<void>();

  protected readonly errorMessage = computed(() => {
    const e = this.error();
    if (!e) return null;
    if (e.kind === 'offline') return 'Sin conexión con el servidor';
    if (e.kind === 'other') return e.message;
    return Object.values(e.fields)[0] ?? 'Datos inválidos';
  });

  constructor() {
    merge(this.reload$, this.search$.pipe(debounceTime(300)))
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.api.list({ status: this.status() || undefined, q: this.q(), sort: this.sort() }).pipe(
            catchError((e: HttpErrorResponse) => {
              this.error.set(toUiError(e));
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((books) => {
        this.error.set(null);
        this.books.set(books);
      });
  }

  protected onSearch(event: Event): void {
    this.q.set((event.target as HTMLInputElement).value);
    this.search$.next();
  }

  protected onStatusFilter(value: Status | ''): void {
    this.status.set(value);
    this.reload$.next();
  }

  protected onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as Sort);
    this.reload$.next();
  }

  protected openCreate(): void {
    this.formErrors.set(null);
    this.editing.set(null);
  }

  protected openEdit(book: Book): void {
    this.formErrors.set(null);
    this.editing.set(book);
  }

  protected closeModal(): void {
    this.editing.set(undefined);
    this.formErrors.set(null);
  }

  protected onSave(input: BookInput): void {
    const current = this.editing();
    const request = current ? this.api.update(current.id, input) : this.api.create(input);
    request.subscribe({
      next: (saved) => {
        this.books.update((list) =>
          current ? list.map((b) => (b.id === saved.id ? saved : b)) : [saved, ...list],
        );
        this.closeModal();
      },
      error: (e: HttpErrorResponse) => {
        const ui = toUiError(e);
        if (ui.kind === 'validation') this.formErrors.set(ui.fields);
        else this.error.set(ui);
      },
    });
  }

  protected patch(book: Book, changes: BookInput): void {
    this.api.update(book.id, changes).subscribe({
      next: (saved) => this.books.update((list) => list.map((b) => (b.id === saved.id ? saved : b))),
      error: (e: HttpErrorResponse) => this.error.set(toUiError(e)),
    });
  }

  protected onRemove(book: Book): void {
    this.api.remove(book.id).subscribe({
      next: () => this.books.update((list) => list.filter((b) => b.id !== book.id)),
      error: (e: HttpErrorResponse) => this.error.set(toUiError(e)),
    });
  }
}
