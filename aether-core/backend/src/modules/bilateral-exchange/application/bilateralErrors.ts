export class BilateralHttpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'BilateralHttpError';
  }
}

export function mapBilateralError(err: unknown): BilateralHttpError {
  if (err instanceof BilateralHttpError) return err;

  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('not found') || message === 'Unknown schema') {
    return new BilateralHttpError(message, 404);
  }
  if (
    message.includes('Not authorized') ||
    message.includes('Not a party') ||
    message.includes('Not consumer') ||
    message.includes('disabled for')
  ) {
    return new BilateralHttpError(message, 403);
  }
  return new BilateralHttpError(message, 400);
}
