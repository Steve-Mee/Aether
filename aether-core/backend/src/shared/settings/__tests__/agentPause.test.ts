import { isAgentPausedFromPrefs } from '../agentPause';

describe('isAgentPausedFromPrefs', () => {
  it('treats missing override as not paused', () => {
    expect(isAgentPausedFromPrefs(undefined, 'pricing')).toBe(false);
    expect(isAgentPausedFromPrefs({ agentOverrides: {} }, 'pricing')).toBe(false);
  });

  it('pauses when enabled === false', () => {
    expect(
      isAgentPausedFromPrefs(
        { agentOverrides: { pricing: { enabled: false } } },
        'pricing'
      )
    ).toBe(true);
  });

  it('does not pause when enabled is true', () => {
    expect(
      isAgentPausedFromPrefs(
        { agentOverrides: { pricing: { enabled: true } } },
        'pricing'
      )
    ).toBe(false);
  });
});
