import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import WebsitePublishPage from '@/pages/WebsitePublishPage';
import { renderWithProviders } from '@/test/render';
import { ApiError } from '@/lib/api';

const listProjects = vi.fn();
const getProject = vi.fn();
const getRevision = vi.fn();
const proposePublish = vi.fn();

vi.mock('@/features/website/api', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/website/api')>('@/features/website/api');
  return {
    ...actual,
    websiteApi: {
      ...actual.websiteApi,
      listProjects: (...args: unknown[]) => listProjects(...args),
      getProject: (...args: unknown[]) => getProject(...args),
      getRevision: (...args: unknown[]) => getRevision(...args),
      proposePublish: (...args: unknown[]) => proposePublish(...args),
    },
  };
});

vi.mock('@/lib/useFeatureStatus', () => ({
  useFeatureStatus: () => 'partial' as const,
  invalidateTruthStatusCache: vi.fn(),
}));

function seedProject() {
  listProjects.mockResolvedValue([
    {
      id: 'proj_1',
      slug: 'atelier-noord',
      status: 'preview',
      liveRevisionId: null,
      createdAt: '2026-07-26T08:00:00.000Z',
    },
  ]);
  getProject.mockResolvedValue({
    id: 'proj_1',
    slug: 'atelier-noord',
    status: 'preview',
    liveRevisionId: null,
    latestRevisionId: 'rev_2',
    latestQaScore: 0.92,
  });
  getRevision.mockResolvedValue({
    id: 'rev_2',
    projectId: 'proj_1',
    version: 2,
    qaScore: 0.92,
    qaReportJson: { score: 0.92, warnings: [], errors: [] },
  });
}

describe('WebsitePublishPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listProjects.mockResolvedValue([]);
    proposePublish.mockResolvedValue({
      approval: {
        id: 'appr_1',
        type: 'PUBLISH_STOREFRONT',
        status: 'pending',
        payload: { projectId: 'proj_1', revisionId: 'rev_2', qaScore: 0.92 },
      },
    });
  });

  it('requests publish approval and links to /approvals', async () => {
    const user = userEvent.setup();
    seedProject();

    renderWithProviders(
      <Routes>
        <Route path="/website/publish" element={<WebsitePublishPage />} />
        <Route path="/approvals" element={<div data-testid="approvals-target" />} />
      </Routes>,
      {
        initialEntries: ['/website/publish'],
        withCommand: false,
      },
    );

    await waitFor(() => {
      expect(screen.getByTestId('website-publish-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('website-publish-approvals-link')).toHaveAttribute(
      'href',
      '/approvals',
    );
    expect(screen.getByText(/nooit automatisch live|never auto-live/i)).toBeInTheDocument();

    await user.click(screen.getByTestId('website-publish-request'));

    await waitFor(() => {
      expect(proposePublish).toHaveBeenCalledWith('rev_2');
    });

    await waitFor(() => {
      expect(screen.getByTestId('approvals-target')).toBeInTheDocument();
    });
  });

  it('surfaces QA gate failure and does not auto-publish', async () => {
    const user = userEvent.setup();
    seedProject();
    proposePublish.mockRejectedValue(
      new ApiError('QA score below threshold', 422, {
        code: 'QA_BELOW_THRESHOLD',
      }),
    );

    renderWithProviders(<WebsitePublishPage />, {
      initialEntries: ['/website/publish'],
      withCommand: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('website-publish-request')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('website-publish-request'));

    await waitFor(() => {
      expect(screen.getByTestId('website-publish-error')).toBeInTheDocument();
    });

    expect(proposePublish).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('website-publish-approvals-link')).toBeInTheDocument();
    expect(screen.queryByText(/^Live$/)).not.toBeInTheDocument();
    expect(screen.getByText(/nooit automatisch live|never auto-live/i)).toBeInTheDocument();
  });
});
