import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_ITEM_EVENT,
  INSIGHT_APPEARED_EVENT,
  NAVIGATE_EVENT,
  NOTIFICATION_EVENT,
  SUPPLIER_CHANGE_EVENT,
} from '../aetherLiveBus';

describe('aetherLiveBus', () => {
  it('exports stable event names', () => {
    expect(NOTIFICATION_EVENT).toBe('aether:notification');
    expect(ACTIVITY_ITEM_EVENT).toBe('aether:activity-item');
    expect(SUPPLIER_CHANGE_EVENT).toBe('aether:supplier-change');
    expect(INSIGHT_APPEARED_EVENT).toBe('aether:insight-appeared');
    expect(NAVIGATE_EVENT).toBe('aether:navigate');
  });
});
