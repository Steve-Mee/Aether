export type SiteProjectStatus = 'draft' | 'preview' | 'live' | 'archived';

export class SiteProject {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public slug: string,
    public primaryDomain: string | null,
    public status: SiteProjectStatus | string,
    public liveRevisionId: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    tenantId: string;
    slug: string;
    primaryDomain?: string | null;
  }): SiteProject {
    const now = new Date();
    return new SiteProject(
      '',
      data.tenantId,
      data.slug,
      data.primaryDomain ?? null,
      'draft',
      null,
      now,
      now
    );
  }
}
