import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WebsiteHubPage from '@/pages/WebsiteHubPage';
import { renderWithProviders } from '@/test/render';

const listProjects = vi.fn();
const createProject = vi.fn();
const getProject = vi.fn();

vi.mock('@/features/website/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/website/api')>('@/features/website/api');
  return {
    ...actual,
    websiteApi: {
      ...actual.websiteApi,
      listProjects: (...args: unknown[]) => listProjects(...args),
      createProject: (...args: unknown[]) => createProject(...args),
      getProject: (...args: unknown[]) => getProject(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('WebsiteHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProjects.mockResolvedValue([]);
    createProject.mockResolvedValue({
      project: {
        id: 'proj_1',
        slug: 'handmade-keramiek',
        status: 'draft',
        createdAt: '2026-07-26T08:00:00.000Z',
      },
      revision: { id: 'rev_1', version: 1, status: 'generating' },
      buildJob: { id: 'build_1', status: 'queued' },
    });
  });

  it('shows empty create flow and creates a project via mocked API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebsiteHubPage />, {
      initialEntries: ['/website'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByTestId('website-hub-page')).toBeInTheDocument();
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();

    await user.type(
      screen.getByTestId('website-create-prompt'),
      'Handmade keramiek, rustiek, Nederlands',
    );
    await user.click(screen.getByTestId('website-create-submit'));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledTimes(1);
    });

    const payload = createProject.mock.calls[0]?.[0] as {
      slug: string;
      brief: { prompt: string };
    };
    expect(payload.brief.prompt).toContain('Handmade keramiek');
    expect(payload.slug.length).toBeGreaterThan(0);
  });

  it('renders hub summary when a project exists', async () => {
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
      latestPreviewUrl: 'https://preview.example/r/rev_2',
      latestQaScore: 0.92,
    });

    renderWithProviders(<WebsiteHubPage />, {
      initialEntries: ['/website'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-hub-summary')).toBeInTheDocument();
    });

    expect(screen.getByText('atelier-noord')).toBeInTheDocument();
    expect(screen.getByText(/0\.92/)).toBeInTheDocument();
  });

  it('surfaces API failure on create', async () => {
    const user = userEvent.setup();
    createProject.mockRejectedValue(new Error('create failed'));

    renderWithProviders(<WebsiteHubPage />, {
      initialEntries: ['/website'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-create-prompt')).toBeInTheDocument();
    });

    await user.type(screen.getByTestId('website-create-prompt'), 'Test shop');
    await user.click(screen.getByTestId('website-create-submit'));

    await waitFor(() => {
      expect(createProject).toHaveBeenCalled();
      expect(screen.getByTestId('website-create-error')).toBeInTheDocument();
    });
  });
});
