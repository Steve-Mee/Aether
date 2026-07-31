export type SiteProjectStatus = 'draft' | 'preview' | 'live' | string;

export interface SiteProjectSummary {
  id: string;
  tenantId?: string;
  slug: string;
  status: SiteProjectStatus;
  primaryDomain?: string | null;
  liveRevisionId?: string | null;
  createdAt?: string;
}

export interface SiteProjectDetail extends SiteProjectSummary {
  latestRevisionId?: string | null;
  latestPreviewUrl?: string | null;
  latestQaScore?: number | null;
}

export interface SiteBrief {
  prompt?: string;
  localeDefault?: string;
  locales?: string[];
  tone?: string;
  audience?: string;
  mustHavePages?: string[];
  brand?: {
    name?: string;
    primaryColor?: string;
    accentColor?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SiteRevisionSummary {
  id: string;
  version: number;
  createdByAgent?: string | null;
  qaScore?: number | null;
  createdAt?: string;
  previewUrl?: string | null;
  status?: string;
}

export interface SiteRevisionDetail extends SiteRevisionSummary {
  projectId: string;
  briefJson?: SiteBrief | null;
  planJson?: unknown;
  qaReportJson?: SiteQaReport | null;
  parentRevisionId?: string | null;
  pages?: SitePageSummary[];
  artifactManifestKeys?: string[];
}

export interface SitePageSummary {
  id: string;
  path: string;
  title: string;
}

export interface SiteQaReport {
  score?: number;
  lighthouse?: {
    performance?: number;
    accessibility?: number;
    seo?: number;
  };
  errors?: string[];
  warnings?: string[];
  [key: string]: unknown;
}

export interface CreateProjectInput {
  slug: string;
  brief?: SiteBrief;
  primaryDomain?: string | null;
}

export interface CreateProjectResponse {
  project: SiteProjectSummary;
  revision: { id: string; version: number; status: string };
  buildJob: { id: string; status: string };
}

export interface CreateRevisionInput {
  parentRevisionId?: string | null;
  deltaPrompt?: string;
  briefPatch?: Record<string, unknown>;
  brief?: SiteBrief;
  plan?: unknown;
}

export interface CreateRevisionResponse {
  revision: { id: string; version: number; status: string };
  buildJob: { id: string; status: string };
}

export interface ProposePublishResponse {
  approval: {
    id: string;
    type: string;
    status: string;
    payload?: {
      projectId?: string;
      revisionId?: string;
      qaScore?: number | null;
      [key: string]: unknown;
    };
  };
}

export interface PreviewUrlResponse {
  previewUrl: string;
  expiresAt?: string;
}
