import { Component, computed, effect, input, linkedSignal, output, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Book, BookCandidate, BookInput, Status } from '../book.model';
import { StatusSelectorComponent } from '../status-selector/status-selector';

const notBlank = (control: AbstractControl) =>
  String(control.value ?? '').trim() ? null : { required: true };

@Component({
  selector: 'app-book-form',
  imports: [ReactiveFormsModule, StatusSelectorComponent],
  styleUrl: './book-form.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      @if (generalError(); as message) {
        <p class="error general" role="alert">{{ message }}</p>
      }

      <div class="field">
        <label for="book-title">Título</label>
        <input id="book-title" name="title" type="text" formControlName="title" />
        @if (form.controls.title.touched && form.controls.title.invalid) {
          <p class="error">El título es obligatorio</p>
        } @else if (serverErrors()?.['title']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label for="book-author">Autor</label>
        <input id="book-author" name="author" type="text" formControlName="author" />
        @if (form.controls.author.touched && form.controls.author.invalid) {
          <p class="error">El autor es obligatorio</p>
        } @else if (serverErrors()?.['author']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label for="book-isbn">ISBN</label>
        <input id="book-isbn" name="isbn" type="text" formControlName="isbn" />
        @if (serverErrors()?.['isbn']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label for="book-pages">Páginas</label>
        <input
          id="book-pages"
          name="pages"
          type="number"
          min="1"
          step="1"
          formControlName="pages"
        />
        @if (serverErrors()?.['pages']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label for="book-description">Descripción</label>
        <textarea
          id="book-description"
          name="description"
          rows="3"
          formControlName="description"
        ></textarea>
        @if (serverErrors()?.['description']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="field">
        <label for="book-cover">URL de portada</label>
        <input id="book-cover" name="coverUrl" type="url" formControlName="coverUrl" />
        @if (coverPreview(); as url) {
          @if (previewFailed()) {
            <p class="preview-error">No se pudo cargar la imagen</p>
          } @else {
            <img
              class="cover-preview"
              [src]="url"
              alt="Vista previa de la portada"
              referrerpolicy="no-referrer"
              (error)="previewFailed.set(true)"
            />
          }
        }
        @if (serverErrors()?.['coverUrl']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="field">
        <app-status-selector
          [status]="form.controls.status.value"
          (statusChange)="onStatus($event)"
        />
        @if (serverErrors()?.['status']; as message) {
          <p class="error">{{ message }}</p>
        }
      </div>

      <div class="actions">
        <button type="submit" class="submit">
          {{ book() ? 'Guardar cambios' : 'Agregar libro' }}
        </button>
        <button type="button" class="cancel" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
})
export class BookFormComponent {
  readonly book = input<Book | null>(null);
  readonly prefill = input<BookCandidate | null>(null);
  readonly serverErrors = input<Record<string, string> | null>(null);
  readonly save = output<BookInput>();
  readonly cancelled = output<void>();

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    author: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    isbn: new FormControl('', { nonNullable: true }),
    pages: new FormControl<number | null>(null),
    description: new FormControl('', { nonNullable: true }),
    coverUrl: new FormControl('', { nonNullable: true }),
    status: new FormControl<Status>('to-read', { nonNullable: true }),
  });

  private readonly coverValue = toSignal(this.form.controls.coverUrl.valueChanges, { initialValue: '' });
  protected readonly coverPreview = computed(() => this.coverValue().trim());
  /** Se reinicia cuando cambia la URL, para volver a intentar con una corregida. */
  protected readonly previewFailed = linkedSignal({ source: this.coverPreview, computation: () => false });

  protected readonly generalError = computed(() => this.serverErrors()?.['pagesRead'] ?? null);

  constructor() {
    effect(() => {
      const book = this.book();
      this.form.reset({
        title: book?.title ?? '',
        author: book?.author ?? '',
        isbn: book?.isbn ?? '',
        pages: book?.pages ?? null,
        description: book?.description ?? '',
        coverUrl: book?.coverUrl ?? '',
        status: book?.status ?? 'to-read',
      });
    });

    effect(() => {
      const candidate = this.prefill();
      if (candidate && !untracked(() => this.book())) {
        this.form.patchValue({
          title: candidate.title,
          author: candidate.author,
          isbn: candidate.isbn ?? '',
          pages: candidate.pages,
          description: candidate.description ?? '',
          coverUrl: candidate.coverUrl ?? '',
        });
      }
    });
  }

  protected onStatus(value: Status | ''): void {
    if (value) this.form.controls.status.setValue(value);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.save.emit({
      title: v.title.trim(),
      author: v.author.trim(),
      isbn: v.isbn.trim() || null,
      description: v.description.trim() || null,
      coverUrl: v.coverUrl.trim() || null,
      pages: v.pages === null || (v.pages as unknown) === '' ? null : Number(v.pages),
      status: v.status,
    });
  }
}
