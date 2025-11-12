import type { ZodError } from 'zod';

import { HttpError } from '../../utils/http-error';

export function zodErrorToHttpError(error: ZodError): HttpError {
  const details = error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  }));

  return new HttpError(422, 'validation_error', 'Invalid request payload.', { issues: details });
}

export function parseWithSchema<T>(
  schema: { parse: (input: unknown) => T },
  payload: unknown,
): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      throw zodErrorToHttpError(error as ZodError);
    }

    throw new HttpError(400, 'invalid_payload', 'Unable to parse request payload.');
  }
}
