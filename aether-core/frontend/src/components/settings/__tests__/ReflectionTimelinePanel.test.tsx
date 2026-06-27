import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReflectionTimelinePanel from '../ReflectionTimelinePanel';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [] }),
  apiRoutes: {
    admin: {
      brainReflectionTimeline: '/api/admin/brain/reflections/timeline',
    },
  },
}));

describe('ReflectionTimelinePanel', () => {
  it('renders empty state', async () => {
    render(<ReflectionTimelinePanel />);
    expect(await screen.findByTestId('reflection-timeline-panel')).toBeInTheDocument();
  });
});
