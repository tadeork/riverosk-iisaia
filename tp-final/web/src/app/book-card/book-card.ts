import { Component, computed, input, output } from '@angular/core';
import { Book, STATUS_LABELS, Status } from '../book.model';
import { ProgressBarComponent } from '../progress-bar/progress-bar';
import { StatusSelectorComponent } from '../status-selector/status-selector';

@Component({
  selector: 'app-book-card',
  imports: [ProgressBarComponent, StatusSelectorComponent],
  styleUrl: './book-card.scss',
  host: { '[class]': '"status-" + book().status' },
  template: `
    <h3>{{ book().title }}</h3>
    <p class="author">{{ book().author }}</p>
    <p class="badge">{{ statusLabel() }}</p>
    @if (showProgress()) {
      <app-progress-bar
        [pages]="book().pages!"
        [pagesRead]="book().pagesRead"
        [disabled]="book().status === 'read'"
        (increment)="progressChange.emit(book().pagesRead + 1)"
        (decrement)="progressChange.emit(book().pagesRead - 1)"
      />
    }
    <app-status-selector
      label="Cambiar estado"
      [status]="book().status"
      (statusChange)="onStatus($event)"
    />
    <div class="actions">
      <button type="button" (click)="edit.emit(book())">Editar</button>
      <button type="button" class="danger" (click)="onRemove()">Eliminar</button>
    </div>
  `,
})
export class BookCardComponent {
  readonly book = input.required<Book>();
  readonly edit = output<Book>();
  readonly remove = output<Book>();
  readonly statusChange = output<Status>();
  readonly progressChange = output<number>();

  protected readonly statusLabel = computed(() => STATUS_LABELS[this.book().status]);
  protected readonly showProgress = computed(() => {
    const b = this.book();
    return (b.status === 'reading' || b.status === 'read') && !!b.pages;
  });

  protected onStatus(value: Status | ''): void {
    if (value && value !== this.book().status) this.statusChange.emit(value);
  }

  protected onRemove(): void {
    if (window.confirm(`¿Eliminar "${this.book().title}"?`)) {
      this.remove.emit(this.book());
    }
  }
}
