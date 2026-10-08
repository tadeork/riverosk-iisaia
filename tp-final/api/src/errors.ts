import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields } });
    return;
  }
  if (err instanceof HttpError) {
    const body: { code: string; message: string; fields?: Record<string, string> } = {
      code: err.code,
      message: err.message,
    };
    if (err.status === 422 && err.fields) body.fields = err.fields;
    res.status(err.status).json({ error: body });
    return;
  }
  if (err?.type && err.status >= 400 && err.status < 500) {
    const message = err.type === 'entity.parse.failed' ? 'Malformed JSON body' : 'Invalid request body';
    res.status(400).json({ error: { code: 'BAD_REQUEST', message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};
