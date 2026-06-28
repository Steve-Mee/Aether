import { describe, expect, it } from 'vitest';
import {
  enrichApproval,
  matchesDateFilter,
  matchesSearch,
  matchesTab,
  sortEnrichedApprovals,
} from './approvalPresentation';
import type { ApprovalItem } from '@/types/approval';

const mailItem: ApprovalItem = {
  id: 'a1',
  module: 'aether-mail',
  actionType: 'email_response',
  payload: {
    emailId: 'e1',
    from: 'klant@example.com',
    subject: 'Levering vertraagd',
    category: 'escalatie',
  },
  status: 'pending',
  createdAt: new Date().toISOString(),
};

const refundItem: ApprovalItem = {
  id: 'a2',
  module: 'payment-fulfillment',
  actionType: 'refund',
  payload: { paymentId: 'p1', amount: 49.99 },
  status: 'pending',
  createdAt: new Date().toISOString(),
};

const priceItem: ApprovalItem = {
  id: 'a3',
  module: 'supplier-intelligence',
  actionType: 'price_change',
  payload: { supplierId: 'Nordic', decision: 'Verhoog met 4%' },
  status: 'pending',
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
};

describe('enrichApproval', () => {
  it('builds mail title and risk band', () => {
    const e = enrichApproval(mailItem);
    expect(e.title).toContain('Levering vertraagd');
    expect(e.riskBand).toBe('medium');
    expect(e.confidence).toBe(0.68);
    expect(e.deepLink?.path).toBe('/emails');
  });

  it('builds refund title and high risk', () => {
    const e = enrichApproval(refundItem);
    expect(e.title).toContain('Terugbetaling');
    expect(e.impact).toContain('€49.99');
    expect(e.riskBand).toBe('high');
    expect(e.accent).toBe('danger');
    expect(e.executionMode).toBe('approval_required');
  });

  it('builds supplier price with medium risk', () => {
    const e = enrichApproval(priceItem);
    expect(e.title).toContain('Nordic');
    expect(e.riskBand).toBe('medium');
    expect(e.rationale).toContain('Verhoog');
  });

  it('uses payload confidence when provided', () => {
    const e = enrichApproval({
      ...mailItem,
      payload: { ...mailItem.payload, confidence: 0.91 },
    });
    expect(e.confidence).toBe(0.91);
  });
});

describe('sortEnrichedApprovals', () => {
  it('sorts high before low', () => {
    const sorted = sortEnrichedApprovals([enrichApproval(mailItem), enrichApproval(refundItem)]);
    expect(sorted[0]!.riskBand).toBe('high');
    expect(sorted[1]!.riskBand).toBe('medium');
  });
});

describe('filters', () => {
  it('matchesSearch on subject', () => {
    const e = enrichApproval(mailItem);
    expect(matchesSearch(e, 'levering')).toBe(true);
    expect(matchesSearch(e, 'xyznone')).toBe(false);
  });

  it('matchesTab by risk band including medium in attention tab', () => {
    expect(matchesTab(enrichApproval(refundItem), 'high')).toBe(true);
    expect(matchesTab(enrichApproval(mailItem), 'high')).toBe(true);
    expect(matchesTab(enrichApproval(mailItem), 'low')).toBe(false);
    expect(matchesTab(enrichApproval(mailItem), 'all')).toBe(true);
  });

  it('builds price impact with pct and sku from payload', () => {
    const e = enrichApproval({
      ...priceItem,
      payload: { supplierId: 'Nordic', changePct: 4.2, skuCount: 12, decision: 'Verhoog' },
    });
    expect(e.impact).toContain('4.2%');
    expect(e.impact).toContain('12 SKU');
  });

  it('matchesDateFilter today', () => {
    expect(matchesDateFilter(new Date().toISOString(), 'today')).toBe(true);
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(matchesDateFilter(old, 'today')).toBe(false);
  });
});
