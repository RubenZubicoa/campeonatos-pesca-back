export class HttpError extends Error {
  readonly status: number
  readonly extras: Record<string, unknown>

  constructor(status: number, message: string, extras: Record<string, unknown> = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.extras = extras
  }
}
