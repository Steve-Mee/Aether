import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityRowCard from '../ActivityRowCard';
import type { ActivityItem } from '@/types/activity';

vi.mock('@/lib/i18n', () => ({
  t: (key: string) => key,
}));

const baseItem: ActivityItem = {
  id: 'row-1',
  source: 'demo',
  at: new Date().toISOString(),
  actionType: 'test',
  actionLabel: 'Test',
  description: 'Test activity',
  module: 'admin-command-bar',
  risk: 'low',
  status: 'autonomous',
  executor: 'aether',
};

describe('ActivityRowCard inline explain', () => {
  it('shows explain button when item has explainability metadata', async () => {
    const user = userEvent.setup();
    const onExplain = vi.fn();
    const item: ActivityItem = {
      ...baseItem,
      details: {
        explainabilitySourceType: 'command',
        explainabilitySourceId: 'cmd-1',
      },
    };

    render(
      <ActivityRowCard
        item={item}
        onSelect={vi.fn()}
        showInlineExplain
        onExplain={onExplain}
      />,
    );

    const btn = screen.getByTestId('activity-row-explain-row-1');
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onExplain).toHaveBeenCalledWith(item);
  });

  it('hides explain button without explainability metadata', () => {
    render(
      <ActivityRowCard
        item={baseItem}
        onSelect={vi.fn()}
        showInlineExplain
        onExplain={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('activity-row-explain-row-1')).not.toBeInTheDocument();
  });
});
