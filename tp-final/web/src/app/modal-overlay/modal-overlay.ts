import { Component, input, output } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'app-modal-overlay',
  styleUrl: './modal-overlay.scss',
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    @if (open()) {
      <div class="backdrop" (click)="closed.emit()">
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <h2 [id]="titleId">{{ title() }}</h2>
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class ModalOverlayComponent {
  readonly open = input.required<boolean>();
  readonly title = input('');
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;

  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }
}
