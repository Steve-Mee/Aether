import { describe, expect, it } from 'vitest';
import { resolveLiveNotificationSeed } from '../demoSeed';

describe('resolveLiveNotificationSeed', () => {
  it('returns demo seed when hybridDemo is enabled', () => {
    const seed = resolveLiveNotificationSeed({ hybridDemo: true, liveDemo: false });
    expect(seed.length).toBeGreaterThan(0);
  });

  it('returns demo seed when liveDemo is enabled', () => {
    const seed = resolveLiveNotificationSeed({ hybridDemo: false, liveDemo: true });
    expect(seed.length).toBeGreaterThan(0);
  });

  it('returns empty inbox in API-only mode', () => {
    const seed = resolveLiveNotificationSeed({ hybridDemo: false, liveDemo: false });
    expect(seed).toEqual([]);
  });
});
