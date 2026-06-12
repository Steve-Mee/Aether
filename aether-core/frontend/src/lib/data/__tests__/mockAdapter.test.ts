import { describe, expect, it, beforeEach } from 'vitest';
import { mockDataAdapter, resetMockAdapterState } from '../adapters/mockAdapter';
import { approvalsRepository } from '../repositories/approvalsRepository';
import { setDataAdapterForTests, resetDataAdapter } from '../createDataAdapter';

describe('mockDataAdapter', () => {
  beforeEach(() => resetMockAdapterState());

  it('returns demo approvals', async () => {
    const list = await mockDataAdapter.fetchApprovals();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]?.status).toBe('pending');
  });

  it('resolve removes approval from mock list', async () => {
    const before = await mockDataAdapter.fetchApprovals();
    const id = before[0]!.id;
    await mockDataAdapter.resolveApproval(id, true);
    const after = await mockDataAdapter.fetchApprovals();
    expect(after.find((a) => a.id === id)).toBeUndefined();
  });

  it('executeCommand returns undoable mock result', async () => {
    const res = await mockDataAdapter.executeCommand('sync suppliers');
    expect(res.success).toBe(true);
    expect(res.commandId).toMatch(/^mock-cmd-/);
    expect(res.undoable).toBe(true);
  });

  it('fetchActivity returns demo items', async () => {
    const feed = await mockDataAdapter.fetchActivity({ days: 7 });
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.source).toBe('live');
  });

  it('fetchSupplierChanges returns demo rows', async () => {
    const changes = await mockDataAdapter.fetchSupplierChanges('pending');
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0]?.changeType).toBe('price_change');
  });

  it('fetchOrders returns demo rows', async () => {
    const orders = await mockDataAdapter.fetchOrders();
    expect(orders.length).toBeGreaterThan(0);
  });

  it('fetchProducts returns demo catalog', async () => {
    const products = await mockDataAdapter.fetchProducts();
    expect(products.length).toBeGreaterThan(0);
  });

  it('fetchEmails and detail work', async () => {
    const list = await mockDataAdapter.fetchEmails();
    expect(list.length).toBeGreaterThan(0);
    const detail = await mockDataAdapter.fetchEmailDetail(list[0]!.id);
    expect(detail?.id).toBe(list[0]!.id);
  });

  it('fetchDashboard returns summary', async () => {
    const dash = await mockDataAdapter.fetchDashboard();
    expect(dash.pendingApprovals).toBeGreaterThanOrEqual(0);
  });

  it('updateSettings mutates mock state', async () => {
    await mockDataAdapter.updateSettings({ locale: 'en' });
    const s = await mockDataAdapter.fetchSettings();
    expect(s.locale).toBe('en');
  });
});

describe('approvalsRepository with mock adapter', () => {
  beforeEach(() => {
    resetMockAdapterState();
    resetDataAdapter();
    setDataAdapterForTests(mockDataAdapter);
  });

  it('lists and resolves via repository', async () => {
    const list = await approvalsRepository.list();
    expect(list.length).toBeGreaterThan(0);
    await approvalsRepository.resolve(list[0]!.id, { approve: true });
    const after = await approvalsRepository.list();
    expect(after.length).toBe(list.length - 1);
  });
});
