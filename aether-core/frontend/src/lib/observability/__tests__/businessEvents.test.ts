import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reportMessage = vi.fn();

vi.mock('../errorReporter', () => ({
  reportMessage: (...args: unknown[]) => reportMessage(...args),
}));

const loggerInfo = vi.fn();
vi.mock('../logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfo(...args),
  },
}));

describe('businessEvents', () => {
  beforeEach(() => {
    vi.resetModules();
    reportMessage.mockClear();
    loggerInfo.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trackBusinessEvent logs locally and reports to observability', async () => {
    const { trackBusinessEvent } = await import('../businessEvents');
    trackBusinessEvent('command.executed', {
      intent: 'sync_suppliers',
      commandId: 'cmd-1',
      success: true,
    });

    expect(loggerInfo).toHaveBeenCalledWith('command.executed', {
      intent: 'sync_suppliers',
      commandId: 'cmd-1',
      success: true,
    });
    expect(reportMessage).toHaveBeenCalledWith(
      'command.executed',
      'info',
      expect.objectContaining({
        event: 'command.executed',
        intent: 'sync_suppliers',
      }),
    );
  });

  it('trackMutationFailure emits mutation.failed with classified kind', async () => {
    const { ApiError } = await import('@/lib/api/errors');
    const { trackMutationFailure } = await import('../businessEvents');
    trackMutationFailure('approvals', new ApiError('Forbidden', 403));

    expect(reportMessage).toHaveBeenCalledWith(
      'mutation.failed',
      'info',
      expect.objectContaining({
        event: 'mutation.failed',
        domain: 'approvals',
        kind: 'auth',
        status: 403,
      }),
    );
  });

  it('trackBusinessEvent emits auth.sign_in', async () => {
    const { trackBusinessEvent } = await import('../businessEvents');
    trackBusinessEvent('auth.sign_in', { userId: 'user-1', method: 'password' });

    expect(reportMessage).toHaveBeenCalledWith(
      'auth.sign_in',
      'info',
      expect.objectContaining({
        event: 'auth.sign_in',
        userId: 'user-1',
        method: 'password',
      }),
    );
  });

  it('trackBusinessEvent emits settings.updated', async () => {
    const { trackBusinessEvent } = await import('../businessEvents');
    trackBusinessEvent('settings.updated', { section: 'approvals', field: 'autoApply' });

    expect(reportMessage).toHaveBeenCalledWith(
      'settings.updated',
      'info',
      expect.objectContaining({
        event: 'settings.updated',
        section: 'approvals',
        field: 'autoApply',
      }),
    );
  });
});
