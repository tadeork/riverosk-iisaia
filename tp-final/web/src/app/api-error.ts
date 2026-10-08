import { HttpErrorResponse } from '@angular/common/http';

export type UiError =
  | { kind: 'validation'; fields: Record<string, string> }
  | { kind: 'offline' }
  | { kind: 'other'; message: string };

const GENERIC_MESSAGE = 'Ocurrió un error inesperado. Intentá de nuevo.';

export function toUiError(e: HttpErrorResponse): UiError {
  if (e.status === 0) return { kind: 'offline' };
  const apiError = e.error?.error;
  if (e.status === 422) {
    return { kind: 'validation', fields: apiError?.fields ?? {} };
  }
  const message = typeof apiError?.message === 'string' ? apiError.message : GENERIC_MESSAGE;
  return { kind: 'other', message };
}
