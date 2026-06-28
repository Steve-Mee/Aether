import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoalStatusBadge, { resolveHealth } from '../GoalStatusBadge';

vi.mock('@/lib/i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      'goals.status.behind': 'Achter op schema',
      'goals.status.onTrack': 'Op schema',
      'goals.status.completed': 'Behaald',
      'goals.status.paused': 'Gepauzeerd',
    };
    return map[key] ?? key;
  },
}));

describe('GoalStatusBadge', () => {
  it('shows behind when active goal progress is below 50%', () => {
    render(<GoalStatusBadge status="active" progressPct={30} />);
    expect(screen.getByText('Achter op schema')).toBeInTheDocument();
  });

  it('shows on track when active goal progress is 50% or more', () => {
    render(<GoalStatusBadge status="active" progressPct={72} />);
    expect(screen.getByText('Op schema')).toBeInTheDocument();
  });

  it('shows completed for completed goals', () => {
    render(<GoalStatusBadge status="completed" progressPct={100} />);
    expect(screen.getByText('Behaald')).toBeInTheDocument();
  });
});

describe('resolveHealth', () => {
  it('maps paused status to paused health', () => {
    expect(resolveHealth('paused', 80)).toBe('paused');
  });
});
