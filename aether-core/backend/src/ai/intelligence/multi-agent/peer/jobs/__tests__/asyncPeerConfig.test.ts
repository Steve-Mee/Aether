import { isAsyncPeerEnabled, resolveAsyncPeerPollMs } from '../asyncPeerConfig';

describe('asyncPeerConfig', () => {
  const prev = process.env.MULTI_AGENT_ASYNC_PEER;

  afterEach(() => {
    process.env.MULTI_AGENT_ASYNC_PEER = prev;
    delete process.env.MULTI_AGENT_ASYNC_PEER_POLL_MS;
  });

  it('is disabled by default in test env without explicit flag', () => {
    delete process.env.MULTI_AGENT_ASYNC_PEER;
    expect(isAsyncPeerEnabled()).toBe(false);
  });

  it('enables when flag is true', () => {
    process.env.MULTI_AGENT_ASYNC_PEER = 'true';
    expect(isAsyncPeerEnabled()).toBe(true);
  });

  it('resolves poll interval', () => {
    process.env.MULTI_AGENT_ASYNC_PEER_POLL_MS = '5000';
    expect(resolveAsyncPeerPollMs()).toBe(5000);
  });
});
