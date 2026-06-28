import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  ACTIVITY_ITEM_EVENT,
  NOTIFICATION_EVENT,
  SUPPLIER_CHANGE_EVENT,
} from '@/lib/aetherLiveBus';
import { afterApprovalResolved, afterCommandExecuted, afterSupplierSynced } from '../sideEffects';
import type { ApprovalItem } from '@/types/approval';

const approvalItem: ApprovalItem = {
  id: 'a1',
  module: 'aether-mail',
  actionType: 'email_response',
  payload: { subject: 'Test' },
  status: 'pending',
  createdAt: new Date().toISOString(),
};

describe('sideEffects', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('afterApprovalResolved dispatches activity item', () => {
    afterApprovalResolved(approvalItem, 'approved');
    expect(window.dispatchEvent).toHaveBeenCalled();
    const event = vi.mocked(window.dispatchEvent).mock.calls[0]![0] as CustomEvent;
    expect(event.type).toBe(ACTIVITY_ITEM_EVENT);
    expect(event.detail?.category).toBe('approval');
  });

  it('afterSupplierSynced dispatches supplier change and notification', () => {
    afterSupplierSynced('sup-1', { supplierName: 'Nordic' });
    const types = vi.mocked(window.dispatchEvent).mock.calls.map((c) => (c[0] as CustomEvent).type);
    expect(types).toContain(SUPPLIER_CHANGE_EVENT);
    expect(types).toContain(NOTIFICATION_EVENT);
  });

  it('afterCommandExecuted dispatches activity for successful command', () => {
    afterCommandExecuted({
      success: true,
      result: 'Done',
      parsedIntent: 'test',
      confidence: 0.9,
      commandId: 'cmd-1',
      originalCommand: 'sync stock',
    });
    const event = vi.mocked(window.dispatchEvent).mock.calls[0]![0] as CustomEvent;
    expect(event.type).toBe(ACTIVITY_ITEM_EVENT);
    expect(event.detail?.category).toBe('command');
  });

  it('afterCommandExecuted skips failed commands', () => {
    vi.mocked(window.dispatchEvent).mockClear();
    afterCommandExecuted({
      success: false,
      result: 'Failed',
      parsedIntent: 'test',
      confidence: 0,
    });
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});
