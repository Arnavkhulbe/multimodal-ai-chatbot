/**
 * Error type whose message is safe to show to the end user.
 * Anything else that escapes a route is treated as an internal error and
 * replaced with a generic message, so implementation details (and provider
 * responses) never reach the browser.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
