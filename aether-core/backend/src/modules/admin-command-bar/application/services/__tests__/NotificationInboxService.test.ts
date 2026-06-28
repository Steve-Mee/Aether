import { mapActivityToNotification } from '../notifications/notificationMappers';
import type { ActivityFeedItem } from '../ActivityFeedService';

describe('mapActivityToNotification', () => {
  const base: ActivityFeedItem = {
    id: 'audit-1',
    source: 'audit',
    at: '2026-06-01T10:00:00.000Z',
    actionType: 'autonomy_execute',
    actionLabel: 'Autonome actie',
    description: 'Voorraad gesynchroniseerd',
    module: 'supplier-intelligence',
    risk: 'low',
    status: 'autonomous',
    executor: 'aether',
  };

  it('skips navigation events', () => {
    expect(
      mapActivityToNotification({ ...base, actionType: 'ui.navigation', module: 'admin-command-bar' })
    ).toBeNull();
  });

  it('maps supplier activity to supplier_change category', () => {
    const n = mapActivityToNotification(base);
    expect(n?.category).toBe('supplier_change');
    expect(n?.href).toBe('/suppliers');
    expect(n?.severity).toBe('info');
  });

  it('maps pending high-risk approval as action severity', () => {
    const n = mapActivityToNotification({
      ...base,
      module: 'approval',
      risk: 'high',
      status: 'pending',
      related: { type: 'approval', id: 'ap-1' },
    });
    expect(n?.severity).toBe('action');
    expect(n?.category).toBe('high_risk_approval');
    expect(n?.href).toContain('approval');
  });
});
