import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PagesCms from '@/pages/PagesCms';
import { renderWithProviders } from '@/test/render';

const listProjects = vi.fn();
const getProject = vi.fn();
const listPages = vi.fn();

vi.mock('@/features/website/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/website/api')>('@/features/website/api');
  return {
    ...actual,
    websiteApi: {
      ...actual.websiteApi,
      listProjects: (...args: unknown[]) => listProjects(...args),
      getProject: (...args: unknown[]) => getProject(...args),
      listPages: (...args: unknown[]) => listPages(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('PagesCms (/pages)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProjects.mockResolvedValue([]);
    listPages.mockResolvedValue([]);
  });

  it('resolves CMS mirror route with truth badge and shared empty state', async () => {
    renderWithProviders(<PagesCms />, {
      initialEntries: ['/pages'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('pages-cms-page')).toBeInTheDocument();
    });

    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
    expect(listProjects).toHaveBeenCalled();
  });

  it('renders page tree from same website hooks as /website/pages', async () => {
    listProjects.mockResolvedValue([
      {
        id: 'proj_1',
        slug: 'atelier-noord',
        status: 'preview',
        createdAt: '2026-07-26T08:00:00.000Z',
      },
    ]);
    getProject.mockResolvedValue({
      id: 'proj_1',
      slug: 'atelier-noord',
      status: 'preview',
      latestRevisionId: 'rev_2',
    });
    listPages.mockResolvedValue([
      { id: 'page_home', path: '/', title: 'Home' },
      { id: 'page_about', path: '/about', title: 'Over ons' },
    ]);

    renderWithProviders(<PagesCms />, {
      initialEntries: ['/pages'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-pages-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('/about')).toBeInTheDocument();
    expect(listPages).toHaveBeenCalledWith('rev_2');
  });
});
