import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast/toast.service';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Shows every failed HTTP response as a toast and rethrows the error,
 * so that the component which made the request can still react to it.
 */
export const errorToastInterceptor: HttpInterceptorFn = (request, next) => {
  const toasts = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        toasts.show(errorMessage(error));
      }
      return throwError(() => error);
    }),
  );
};

/**
 * Builds the text from a ProblemDetails body: `detail`, else `title`, followed by the
 * messages of the `errors` object (400 validation). Falls back to a generic message when
 * the body is not ProblemDetails, e.g. for status 0 or a non-JSON response.
 */
export function errorMessage(error: HttpErrorResponse): string {
  const body = asRecord(error.error);
  const base = body ? firstText(body['detail'], body['title']) : undefined;
  const fieldMessages = body ? fieldErrorMessages(body['errors']) : [];

  const parts = [base, ...fieldMessages].filter((part): part is string => part !== undefined);
  return parts.length > 0 ? parts.join(' ') : GENERIC_ERROR_MESSAGE;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return undefined;
}

function fieldErrorMessages(errors: unknown): string[] {
  const fields = asRecord(errors);
  if (!fields) {
    return [];
  }
  return Object.values(fields)
    .filter((messages): messages is unknown[] => Array.isArray(messages))
    .flat()
    .filter((message): message is string => typeof message === 'string' && message.trim() !== '')
    .map((message) => message.trim());
}
