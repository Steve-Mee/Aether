import {
  buildActivityFeed,
  resolveActivitySince,
} from '../ActivityFeedService';

const mockAudits = [
  {
    id: 'a1',
    tenantId: 'tenant_a',
    module: 'autonomy',
    action: 'autonomy_execute',
    actor: 'system',
    details: JSON.stringify({ description: 'Prijs sync uitgevoerd', confidence: 0.92 }),
    createdAt: new Date('2026-06-01T10:00:00Z'),
  },
  {
    id: 'a2',
    tenantId: 'tenant_a',
    module: 'approval',
    action: 'approved',
    actor: 'user_1',
    details: JSON.stringify({ approvalId: 'ap_1', risk: 'high' }),
    createdAt: new Date('2026-06-02T11:00:00Z'),
  },
  {
    id: 'a3',
    tenantId: 'tenant_a',
    module: 'admin-command-bar',
    action: 'ui.navigation',
    actor: 'user_1',
    details: JSON.stringify({ path: '/timeline' }),
    createdAt: new Date('2026-06-02T12:00:00Z'),
  },
];

const mockCommands = [
  {
    id: 'c1',
    tenantId: 'tenant_a',
    command: 'Verhoog marge outdoor',
    intent: 'PRICE_ADJUST',
    result: '12 SKU bijgewerkt',
    confidence: 0.88,
    actor: null,
    createdAt: new Date('2026-06-03T09:00:00Z'),
  },
];

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    auditLog: { findMany: jest.fn() },
    command: { findMany: jest.fn() },
  },
}));

jest.mock('../../../../../ai/intelligence/explainability/ExplainabilityPersister', () => ({
  explainabilityPersister: {
    getSnapshot: jest.fn().mockResolvedValue(null),
  },
}));

import { prisma } from '../../../../../shared/prisma/client';

describe('ActivityFeedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(
      mockAudits.filter((a) => a.action !== 'ui.navigation')
    );
    (prisma.command.findMany as jest.Mock).mockResolvedValue(mockCommands);
  });

  it('maps audit actions to feed items with risk and status', async () => {
    const { items } = await buildActivityFeed({
      tenantId: 'tenant_a',
      since: new Date('2026-05-01'),
      limit: 50,
    });

    const autonomous = items.find((i) => i.actionType === 'autonomy_execute');
    expect(autonomous?.status).toBe('autonomous');
    expect(autonomous?.executor).toBe('aether');
    expect(autonomous?.risk).toBe('low');

    const approved = items.find((i) => i.actionType === 'approved');
    expect(approved?.status).toBe('approved');
    expect(approved?.executor).toBe('merchant');
    expect(approved?.risk).toBe('high');
    expect(approved?.related).toEqual({ type: 'approval', id: 'ap_1' });
  });

  it('excludes ui.navigation by default', async () => {
    const { items } = await buildActivityFeed({
      tenantId: 'tenant_a',
      since: new Date('2026-05-01'),
    });
    expect(items.some((i) => i.actionType === 'ui.navigation')).toBe(false);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ NOT: { action: 'ui.navigation' } }),
      })
    );
  });

  it('includes commands merged and sorted desc', async () => {
    const { items } = await buildActivityFeed({
      tenantId: 'tenant_a',
      since: new Date('2026-05-01'),
    });
    expect(items[0].source).toBe('command');
    expect(items[0].actionType).toBe('command_executed');
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it('resolveActivitySince uses days window', () => {
    const since = resolveActivitySince(7);
    const diffDays = (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThan(8);
  });
});
