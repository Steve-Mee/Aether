import { proactiveSuggestionEmitter } from '../ProactiveSuggestionEmitter';

const sseEnabled = jest.fn(() => true);

jest.mock('../proactiveConfig', () => ({
  isProactiveSseEnabled: () => sseEnabled(),
}));

describe('ProactiveSuggestionEmitter', () => {
  beforeEach(() => {
    sseEnabled.mockReturnValue(true);
  });

  it('notifies subscribers on emit', () => {
    const events: unknown[] = [];
    const unsub = proactiveSuggestionEmitter.subscribe('tenant-1', (e) => events.push(e));
    proactiveSuggestionEmitter.emit('tenant-1', 'created', ['s1'], 1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'created', ids: ['s1'], count: 1 });
    unsub();
  });

  it('does not emit when SSE disabled', () => {
    sseEnabled.mockReturnValue(false);
    const events: unknown[] = [];
    proactiveSuggestionEmitter.subscribe('tenant-2', (e) => events.push(e));
    proactiveSuggestionEmitter.emit('tenant-2', 'created', ['s2'], 1);
    expect(events).toHaveLength(0);
  });

  it('unsubscribe removes listener', () => {
    const events: unknown[] = [];
    const unsub = proactiveSuggestionEmitter.subscribe('tenant-3', (e) => events.push(e));
    unsub();
    proactiveSuggestionEmitter.emit('tenant-3', 'dismissed', ['s3'], 0);
    expect(events).toHaveLength(0);
  });
});
