/** Expected failures carry a stable public code and safe message. */
export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly errorCode: string, message: string, public readonly errors?: { path: string; message: string }[]) { super(message); }
}
