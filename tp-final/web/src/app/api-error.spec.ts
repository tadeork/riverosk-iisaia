import { HttpErrorResponse } from '@angular/common/http';
import { toUiError } from './api-error';

describe('toUiError', () => {
  it('status 0 → offline', () => {
    const e = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    expect(toUiError(e)).toEqual({ kind: 'offline' });
  });

  it('422 → validation con fields', () => {
    const e = new HttpErrorResponse({
      status: 422,
      error: { error: { code: 'VALIDATION_ERROR', message: 'x', fields: { title: 'Requerido' } } },
    });
    expect(toUiError(e)).toEqual({ kind: 'validation', fields: { title: 'Requerido' } });
  });

  it('404 → other con message', () => {
    const e = new HttpErrorResponse({
      status: 404,
      error: { error: { code: 'NOT_FOUND', message: 'Libro no encontrado' } },
    });
    expect(toUiError(e)).toEqual({ kind: 'other', message: 'Libro no encontrado' });
  });

  it('500 sin body parseable → other con texto genérico', () => {
    const e = new HttpErrorResponse({ status: 500, error: '<html>boom</html>' });
    const r = toUiError(e);
    expect(r.kind).toBe('other');
    expect(r.kind === 'other' && r.message.length > 0).toBe(true);
  });
});
