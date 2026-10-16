import type { ApiErrorBody } from '@acme/shared'
import type { ErrorRequestHandler, RequestHandler, Response } from 'express'
import { DomainValidationError, NotFoundError } from '../errors'

export type ErrorLogger = (error: unknown) => void

function sendError(res: Response, status: number, error: ApiErrorBody['error']): void {
  res.status(status).json({ error } satisfies ApiErrorBody)
}

export const unknownRoute: RequestHandler = (_req, res) => {
  sendError(res, 404, { message: 'Not found' })
}

function isMalformedJson(error: unknown): boolean {
  return (error as { type?: unknown } | null)?.type === 'entity.parse.failed'
}

/** The only place that turns errors into status codes; services just throw. */
export function errorHandler(logError: ErrorLogger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof NotFoundError) {
      sendError(res, 404, { message: error.message })
    } else if (error instanceof DomainValidationError) {
      sendError(res, 422, { message: error.message, fields: error.fields })
    } else if (isMalformedJson(error)) {
      sendError(res, 400, { message: 'Malformed JSON body' })
    } else {
      logError(error)
      sendError(res, 500, { message: 'Internal server error' })
    }
  }
}
