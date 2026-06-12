import { describe, expect, it, beforeEach, vi } from 'vitest';
import { setDataAdapterForTests, resetDataAdapter } from '../createDataAdapter';
import { httpDataAdapter } from '../adapters/httpAdapter';
import { commandsRepository } from '../repositories/commandsRepository';
import { approvalsRepository } from '../repositories/approvalsRepository';
import { activityRepository } from '../repositories/activityRepository';
import { dashboardRepository } from '../repositories/dashboardRepository';
import { settingsRepository } from '../repositories/settingsRepository';
import { adminRepository } from '../repositories/adminRepository';
import { notificationsRepository } from '../repositories/notificationsRepository';
import { resetMswState, setMswExecuteFails, setMswResolveFails } from '@/test/handlers';
import {
  mockApprovalsPending,
  mockDashboard,
  mockMerchantSettings,
  mockSupplierOverview,
  mockTruthStatus,
  mockActivityFeed,
} from '@/test/fixtures';

vi.mock('@/lib/config/env', () => ({
  env: {
    dataSource: 'live' as const,
    apiUrl: 'http://localhost:9000',
    apiKey: 'test-key',
    tenantId: 'tenant_test',
  },
}));

describe('httpAdapter + MSW contract', () => {
  beforeEach(() => {
    resetMswState();
    resetDataAdapter();
    setDataAdapterForTests(null);
  });

  it('executes command via MSW handler', async () => {
    const result = await commandsRepository.execute('Sync leveranciers');
    expect(result.success).toBe(true);
    expect(result.originalCommand).toBe('Sync leveranciers');
    expect(result.commandId).toMatch(/^msw-cmd-/);
  });

  it('undoes command via MSW handler', async () => {
    const executed = await commandsRepository.execute('Undo test');
    const undo = await commandsRepository.undo(executed.commandId!);
    expect(undo.success).toBe(true);
    expect(undo.commandId).toBe(executed.commandId);
  });

  it('lists and resolves approvals via MSW', async () => {
    const list = await approvalsRepository.list();
    expect(list.length).toBe(mockApprovalsPending.length);

    const id = list[0]!.id;
    await approvalsRepository.resolve(id, { approve: true });
    const after = await approvalsRepository.list();
    expect(after.find((a) => a.id === id)).toBeUndefined();
  });

  it('auto-applies low-risk approvals via MSW', async () => {
    const result = await approvalsRepository.autoApply();
    expect(result.applied).toBeGreaterThanOrEqual(0);
    expect(typeof result.skipped).toBe('number');
  });

  it('httpDataAdapter executeCommand matches repository path', async () => {
    const direct = await httpDataAdapter.executeCommand('direct');
    expect(direct.parsedIntent).toBe('APPROVE_CHANGES');
  });

  it('fetches dashboard via MSW', async () => {
    const dashboard = await dashboardRepository.fetch();
    expect(dashboard.tenantDisplayName).toBe(mockDashboard.tenantDisplayName);
  });

  it('fetches activity feed via MSW', async () => {
    const feed = await activityRepository.fetch({ days: 7 });
    expect(feed.items.length).toBe(mockActivityFeed.items.length);
    expect(feed.source).toBe('live');
  });

  it('fetches and updates settings via MSW', async () => {
    const settings = await settingsRepository.fetch();
    expect(settings.locale).toBe(mockMerchantSettings.settings.locale);

    const updated = await settingsRepository.update({ locale: 'en' });
    expect(updated.locale).toBe('en');
  });

  it('fetches command history via MSW', async () => {
    const history = await commandsRepository.history();
    expect(Array.isArray(history)).toBe(true);
  });

  it('fetches suppliers overview via MSW', async () => {
    const overview = await httpDataAdapter.fetchSuppliersOverview();
    expect(overview.stats.totalMonitored).toBe(mockSupplierOverview.stats.totalMonitored);
  });

  it('fetches truth status via MSW', async () => {
    const status = await adminRepository.truthStatus();
    expect(status.version).toBe(mockTruthStatus.version);
  });

  it('fetches suggestions via MSW', async () => {
    const suggestions = await adminRepository.suggestions('/command-center', 5);
    expect(suggestions).toHaveProperty('suggestions');
  });

  it('fetches notifications inbox via MSW', async () => {
    const inbox = await notificationsRepository.list();
    expect(Array.isArray(inbox)).toBe(true);
  });

  it('persists notification read state via MSW', async () => {
    const before = await notificationsRepository.list();
    expect(before[0]?.read).toBe(false);

    await notificationsRepository.markRead('notif-msw-1');
    const afterRead = await notificationsRepository.list();
    expect(afterRead[0]?.read).toBe(true);

    await notificationsRepository.dismiss('notif-msw-1');
    const afterDismiss = await notificationsRepository.list();
    expect(afterDismiss.find((n) => n.id === 'notif-msw-1')).toBeUndefined();
  });

  it('throws when command execute fails via MSW', async () => {
    setMswExecuteFails(true);
    await expect(commandsRepository.execute('fail')).rejects.toThrow();
  });

  it('throws when approval resolve fails via MSW', async () => {
    setMswResolveFails(true);
    const list = await approvalsRepository.list();
    await expect(approvalsRepository.resolve(list[0]!.id, { approve: true })).rejects.toThrow();
  });
});
