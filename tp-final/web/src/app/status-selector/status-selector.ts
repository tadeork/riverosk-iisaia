import { Component, input, output } from '@angular/core';
import { STATUS_LABELS, Status } from '../book.model';

let nextId = 0;

@Component({
  selector: 'app-status-selector',
  styleUrl: './status-selector.scss',
  template: `
    <label [for]="id">{{ label() }}</label>
    <select [id]="id" [value]="status() ?? ''" (change)="onChange($event)">
      @if (allowAll()) {
        <option value="" [selected]="!status()">Todos</option>
      }
      @for (opt of options; track opt.value) {
        <option [value]="opt.value" [selected]="opt.value === status()">{{ opt.label }}</option>
      }
    </select>
  `,
})
export class StatusSelectorComponent {
  readonly status = input<Status | ''>();
  readonly allowAll = input(false);
  readonly label = input('Estado');
  readonly statusChange = output<Status | ''>();

  protected readonly id = `status-selector-${nextId++}`;
  protected readonly options = (Object.keys(STATUS_LABELS) as Status[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  }));

  protected onChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusChange.emit(select.value as Status | '');
    // El padre re-renderiza con el valor del servidor si el cambio prospera;
    // si falla, el input no cambió y el select nativo conservaría el valor rechazado.
    select.value = this.status() ?? '';
  }
}
