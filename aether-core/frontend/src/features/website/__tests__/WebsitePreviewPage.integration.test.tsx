import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WebsitePreviewPage from '@/pages/WebsitePreviewPage';
import { renderWithProviders } from '@/test/render';

const listProjects = vi.fn();
const getProject = vi.fn();
const getPreviewUrl = vi.fn();
const listRevisions = vi.fn();
const createRevision = vi.fn();
const startBuild = vi.fn();

vi.mock('@/features/website/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/website/api')>('@/features/website/api');
  return {
    ...actual,
    websiteApi: {
      ...actual.websiteApi,
      listProjects: (...args: unknown[]) => listProjects(...args),
      getProject: (...args: unknown[]) => getProject(...args),
      getPreviewUrl: (...args: unknown[]) => getPreviewUrl(...args),
      listRevisions: (...args: unknown[]) => listRevisions(...args),
      createRevision: (...args: unknown[]) => createRevision(...args),
      startBuild: (...args: unknown[]) => startBuild(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

describe('WebsitePreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProjects.mockResolvedValue([]);
    listRevisions.mockResolvedValue([]);
    createRevision.mockResolvedValue({
      revision: { id: 'rev_3', version: 3, status: 'generating' },
      buildJob: { id: 'build_3', status: 'queued' },
    });
  });

  it('shows empty state when no project exists', async () => {
    renderWithProviders(<WebsitePreviewPage />, {
      initialEntries: ['/website/preview'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-preview-page')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('website-preview-iframe')).not.toBeInTheDocument();
    expect(screen.queryByText(/status\.live/i)).not.toBeInTheDocument();
  });

  it('loads preview iframe from P08 URL and iterates via revisions API', async () => {
    const user = userEvent.setup();
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
      latestPreviewUrl: 'http://localhost:4177/preview/rev_2?token=stale',
      latestQaScore: 0.91,
    });
    getPreviewUrl.mockResolvedValue({
      previewUrl: 'http://localhost:4177/preview/rev_2?token=signed',
      expiresAt: '2026-07-26T08:15:00.000Z',
    });
    listRevisions.mockResolvedValue([
      {
        id: 'rev_2',
        version: 2,
        createdByAgent: 'StoreBuilderAgent',
        qaScore: 0.91,
      },
    ]);

    renderWithProviders(<WebsitePreviewPage />, {
      initialEntries: ['/website/preview'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-preview-iframe')).toBeInTheDocument();
    });

    const iframe = screen.getByTestId('website-preview-iframe');
    expect(iframe).toHaveAttribute('src', 'http://localhost:4177/preview/rev_2?token=signed');
    expect(getPreviewUrl).toHaveBeenCalledWith('rev_2');

    await user.type(screen.getByTestId('website-iterate-prompt'), 'Maak de hero rustiger');
    await user.click(screen.getByTestId('website-iterate-submit'));

    await waitFor(() => {
      expect(createRevision).toHaveBeenCalledTimes(1);
    });

    expect(createRevision).toHaveBeenCalledWith(
      'proj_1',
      expect.objectContaining({
        parentRevisionId: 'rev_2',
        deltaPrompt: 'Maak de hero rustiger',
      }),
    );
  });

  it('surfaces iterate API failure without claiming live', async () => {
    const user = userEvent.setup();
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
    getPreviewUrl.mockResolvedValue({
      previewUrl: 'http://localhost:4177/preview/rev_2?token=signed',
    });
    createRevision.mockRejectedValue(new Error('iterate failed'));

    renderWithProviders(<WebsitePreviewPage />, {
      initialEntries: ['/website/preview'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-iterate-prompt')).toBeInTheDocument();
    });

    await user.type(screen.getByTestId('website-iterate-prompt'), 'Change CTA');
    await user.click(screen.getByTestId('website-iterate-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('website-iterate-error')).toBeInTheDocument();
    });

    expect(screen.queryByText(/status\.live/i)).not.toBeInTheDocument();
  });
});
