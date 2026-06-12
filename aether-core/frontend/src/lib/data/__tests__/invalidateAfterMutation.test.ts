import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  invalidateAfterApprovalChange,
  invalidateAfterCommandChange,
  invalidateAfterSupplierChange,
  optimisticInsightsBump,
} from '../invalidateAfterMutation';
import { queryKeys } from '@/lib/query/keys';

describe('invalidateAfterMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('invalidateAfterApprovalChange targets approvals, dashboard, activity, insights', () => {
    invalidateAfterApprovalChange(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['approvals'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['activity'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.activity({ days: 7, limit: 5 }),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.list(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.overview(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['outcomes']) }),
    );
  });

  it('invalidateAfterCommandChange includes insights, home landing queries, and command history', () => {
    invalidateAfterCommandChange(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.activity({ days: 7, limit: 5 }),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.list(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['autonomy-metrics']) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['outcomes']) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['commands', 'history'],
    });
  });

  it('optimisticInsightsBump patches all cached autonomy-metrics periods', () => {
    queryClient.setQueryData(queryKeys.autonomyMetrics(7), {
      totalDecisions: 5,
      autonomousDecisions: 3,
      humanGatedDecisions: 2,
      autonomyRate: 0.6,
      targetMet: true,
      status: 'live',
    });
    queryClient.setQueryData(queryKeys.autonomyMetrics(30), {
      totalDecisions: 10,
      autonomousDecisions: 7,
      humanGatedDecisions: 3,
      autonomyRate: 0.7,
      targetMet: true,
      status: 'live',
    });
    optimisticInsightsBump(queryClient, 'command');
    expect(queryClient.getQueryData(queryKeys.autonomyMetrics(7))).toMatchObject({
      totalDecisions: 6,
      autonomousDecisions: 4,
    });
    expect(queryClient.getQueryData(queryKeys.autonomyMetrics(30))).toMatchObject({
      totalDecisions: 11,
      autonomousDecisions: 8,
    });
  });

  it('invalidateAfterSupplierChange targets suppliers, activity, and dashboard', () => {
    invalidateAfterSupplierChange(queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['suppliers'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['activity'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dashboard'],
    });
  });
});
