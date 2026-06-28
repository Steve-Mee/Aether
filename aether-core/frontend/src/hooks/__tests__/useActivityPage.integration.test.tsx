import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useActivityPage } from '../useActivityPage';
import { createHookWrapper } from '@/test/render';
import { dispatchActivityItem } from '@/lib/aetherLiveBus';
import { buildActivityItemFromApproval, buildHighRiskApproval } from '@/test/factories/approval';
import { mockActivityFeed } from '@/test/fixtures';

describe('useActivityPage integration', () => {
  it('merges ephemeral activity items from live bus into feed', async () => {
    const { Wrapper } = createHookWrapper({
      initialEntries: ['/timeline'],
      withCommand: true,
    });

    const { result } = renderHook(() => useActivityPage(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const ephemeral = buildActivityItemFromApproval(buildHighRiskApproval(), 'approved');
    act(() => {
      dispatchActivityItem(ephemeral);
    });

    await waitFor(() => {
      expect(result.current.merged.items.some((i) => i.id === ephemeral.id)).toBe(true);
    });

    expect(result.current.merged.items.length).toBeGreaterThan(mockActivityFeed.items.length);
  });
});
