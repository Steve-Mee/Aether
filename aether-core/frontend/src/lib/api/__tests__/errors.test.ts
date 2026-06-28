import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError, shouldReportError } from '../errors';

describe('shouldReportError', () => {
  it('reports network and server errors', () => {
    expect(shouldReportError(new NetworkError('offline'))).toBe(true);
    expect(shouldReportError(new ApiError('Server error', 500))).toBe(true);
    expect(shouldReportError(new ApiError('Too many', 429))).toBe(true);
  });

  it('does not report auth or validation errors', () => {
    expect(shouldReportError(new ApiError('Unauthorized', 401))).toBe(false);
    expect(shouldReportError(new ApiError('Forbidden', 403))).toBe(false);
    expect(shouldReportError(new ApiError('Bad request', 400))).toBe(false);
    expect(shouldReportError(new ApiError('Invalid', 422))).toBe(false);
  });
});
