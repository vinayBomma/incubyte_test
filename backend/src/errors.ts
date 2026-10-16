import type { FieldErrors } from '@acme/shared'

export class NotFoundError extends Error {
  override name = 'NotFoundError'
}

export class DomainValidationError extends Error {
  override name = 'DomainValidationError'
  readonly fields: FieldErrors

  constructor(fields: FieldErrors, message = 'Please fix the highlighted fields.') {
    super(message)
    this.fields = fields
  }
}
