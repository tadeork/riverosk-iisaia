import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  styleUrl: './progress-bar.scss',
  template: `
    <div class="progress">
      <button
        type="button"
        class="step"
        aria-label="Restar una página"
        [disabled]="disabled() || pagesRead() <= 0"
        (click)="decrement.emit()"
      >
        −
      </button>
      <div class="track" aria-hidden="true">
        <div class="fill" [style.width.%]="percent()"></div>
      </div>
      <button
        type="button"
        class="step"
        aria-label="Sumar una página"
        [disabled]="disabled() || pagesRead() >= pages()"
        (click)="increment.emit()"
      >
        +
      </button>
    </div>
    <p class="summary">
      <strong>{{ percent() }}%</strong> · {{ pagesRead() }} / {{ pages() }} páginas
    </p>
  `,
})
export class ProgressBarComponent {
  readonly pages = input.required<number>();
  readonly pagesRead = input.required<number>();
  readonly disabled = input(false);
  readonly increment = output<void>();
  readonly decrement = output<void>();

  protected readonly percent = computed(() =>
    this.pages() > 0 ? Math.round((this.pagesRead() / this.pages()) * 100) : 0,
  );
}
