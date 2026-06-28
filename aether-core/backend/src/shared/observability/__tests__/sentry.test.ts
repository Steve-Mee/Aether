import * as Sentry from '@sentry/node';
import { shouldReportServerError, shutdownSentry } from '../sentry';

jest.mock('@sentry/node', () => {
  const actual = jest.requireActual('@sentry/node');
  return {
    ...actual,
    isInitialized: jest.fn(),
    close: jest.fn().mockResolvedValue(true),
  };
});

describe('shouldReportServerError', () => {
  it('reports 5xx errors', () => {
    expect(shouldReportServerError(500)).toBe(true);
    expect(shouldReportServerError(503)).toBe(true);
  });

  it('does not report 4xx client errors', () => {
    expect(shouldReportServerError(400)).toBe(false);
    expect(shouldReportServerError(401)).toBe(false);
    expect(shouldReportServerError(422)).toBe(false);
    expect(shouldReportServerError(404)).toBe(false);
  });
});

describe('shutdownSentry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flushes Sentry on shutdown when initialized', async () => {
    (Sentry.isInitialized as jest.Mock).mockReturnValue(true);
    await shutdownSentry(2000);
    expect(Sentry.close).toHaveBeenCalledWith(2000);
  });

  it('no-ops when Sentry is not initialized', async () => {
    (Sentry.isInitialized as jest.Mock).mockReturnValue(false);
    await shutdownSentry();
    expect(Sentry.close).not.toHaveBeenCalled();
  });
});
