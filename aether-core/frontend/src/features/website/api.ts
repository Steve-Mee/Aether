import { apiFetch, apiRoutes } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import type {
  CreateProjectInput,
  CreateProjectResponse,
  CreateRevisionInput,
  CreateRevisionResponse,
  PreviewUrlResponse,
  ProposePublishResponse,
  SitePageSummary,
  SiteProjectDetail,
  SiteProjectSummary,
  SiteRevisionDetail,
  SiteRevisionSummary,
} from './types';

export const websiteApi = {
  queryKeys: queryKeys.website,

  listProjects: () =>
    apiFetch<{ projects: SiteProjectSummary[] }>(apiRoutes.website.projects).then(
      (res) => res.projects,
    ),

  getProject: (projectId: string) =>
    apiFetch<{ project: SiteProjectDetail }>(apiRoutes.website.project(projectId)).then(
      (res) => res.project,
    ),

  createProject: (input: CreateProjectInput) =>
    apiFetch<CreateProjectResponse>(apiRoutes.website.projects, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listRevisions: (projectId: string) =>
    apiFetch<{ revisions: SiteRevisionSummary[] }>(apiRoutes.website.revisions(projectId)).then(
      (res) => res.revisions,
    ),

  createRevision: (projectId: string, input: CreateRevisionInput) =>
    apiFetch<CreateRevisionResponse>(apiRoutes.website.revisions(projectId), {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getRevision: (revisionId: string) =>
    apiFetch<{ revision: SiteRevisionDetail }>(apiRoutes.website.revision(revisionId)).then(
      (res) => res.revision,
    ),

  listPages: (revisionId: string) =>
    apiFetch<{ pages: SitePageSummary[] }>(apiRoutes.website.revisionPages(revisionId)).then(
      (res) => res.pages,
    ),

  startBuild: (revisionId: string) =>
    apiFetch<{ buildJob: { id: string; status: string } }>(
      apiRoutes.website.revisionBuild(revisionId),
      { method: 'POST' },
    ),

  proposePublish: (revisionId: string) =>
    apiFetch<ProposePublishResponse>(apiRoutes.website.revisionPublish(revisionId), {
      method: 'POST',
    }),

  getPreviewUrl: (revisionId: string) =>
    apiFetch<PreviewUrlResponse>(apiRoutes.website.preview(revisionId)),

  updatePageCopy: (
    pageId: string,
    input: { headline?: string; subheadline?: string }
  ) =>
    apiFetch<CreateRevisionResponse & { pagePath: string; published: boolean }>(
      apiRoutes.website.pageCopy(pageId),
      { method: 'PATCH', body: JSON.stringify(input) }
    ),
};

/** Derive a URL-safe slug from a free-text brief prompt. */
export function slugifyPrompt(prompt: string): string {
  const base = prompt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'store';
}
