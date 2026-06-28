import { itemMatchesAgentKey } from '../ActivityFeedService';

describe('activity agentKey filter matching', () => {
  it('matches agentKeys array on item', () => {
    expect(itemMatchesAgentKey({ agentKeys: ['customer', 'pricing'] } as never, 'customer')).toBe(
      true,
    );
    expect(itemMatchesAgentKey({ agentKeys: ['inventory'] } as never, 'customer')).toBe(false);
  });

  it('matches agentKey in details', () => {
    expect(
      itemMatchesAgentKey({ details: { agentKey: 'inventory' } } as never, 'inventory'),
    ).toBe(true);
  });
});
