import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of, Subject, switchMap } from 'rxjs';
import { toUiError } from '../api-error';
import { BookCandidate } from '../book.model';
import { LookupApi } from '../lookup.api';

type LookupState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; items: BookCandidate[] }
  | { kind: 'error'; message: string }
  | { kind: 'picked' };

const GOOGLE_ERROR = 'No se pudo consultar Google Books. Probá de nuevo o cargalo a mano.';

@Component({
  selector: 'app-book-lookup',
  styleUrl: './book-lookup.scss',
  template: `
    <div class="lookup">
      <label for="lookup-q">Buscar en Google Books</label>
      <div class="row">
        <input
          id="lookup-q"
          type="text"
          maxlength="200"
          [value]="query()"
          (input)="onInput($event)"
          (keydown.enter)="search()"
        />
        <button type="button" class="search" [disabled]="!canSearch()" (click)="search()">
          Buscar
        </button>
      </div>

      @switch (state().kind) {
        @case ('loading') {
          <p class="status" role="status">Buscando…</p>
        }
        @case ('error') {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        }
        @case ('results') {
          @if (items().length === 0) {
            <p class="status" role="status">No se encontraron libros.</p>
          } @else {
            <ul class="candidates">
              @for (c of items(); track $index) {
                <li>
                  <button type="button" class="candidate" (click)="pick(c)">
                    {{ c.title }} — {{ c.author }}@if (c.pages !== null) { · {{ c.pages }} págs.}
                  </button>
                </li>
              }
            </ul>
          }
        }
        @case ('picked') {
          <p #notice class="status" role="status" tabindex="-1">Datos cargados desde Google Books: revisalos antes de guardar.</p>
        }
      }
    </div>
  `,
})
export class BookLookupComponent {
  private readonly api = inject(LookupApi);
  private readonly injector = inject(Injector);
  private readonly notice = viewChild<ElementRef<HTMLElement>>('notice');

  readonly picked = output<BookCandidate>();

  protected readonly query = signal('');
  protected readonly state = signal<LookupState>({ kind: 'idle' });

  protected readonly canSearch = computed(
    () => this.query().trim() !== '' && this.state().kind !== 'loading',
  );
  protected readonly items = computed(() => {
    const s = this.state();
    return s.kind === 'results' ? s.items : [];
  });
  protected readonly errorMessage = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  });

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        switchMap((q) =>
          this.api.search(q).pipe(
            catchError((e: HttpErrorResponse) =>
              of<LookupState>({
                kind: 'error',
                message:
                  toUiError(e).kind === 'offline' ? 'Sin conexión con el servidor' : GOOGLE_ERROR,
              }),
            ),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((result) =>
        this.state.set(Array.isArray(result) ? { kind: 'results', items: result } : result),
      );
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected search(): void {
    const q = this.query().trim();
    if (!q) return;
    // Enter durante la carga está permitido: switchMap cancela el request anterior.
    this.state.set({ kind: 'loading' });
    this.search$.next(q);
  }

  protected pick(candidate: BookCandidate): void {
    this.state.set({ kind: 'picked' });
    this.picked.emit(candidate);
    // El botón clickeado desaparece: llevamos el foco al aviso para no perderlo.
    afterNextRender(() => this.notice()?.nativeElement.focus(), { injector: this.injector });
  }
}
