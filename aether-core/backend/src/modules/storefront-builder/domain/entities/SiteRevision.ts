export class SiteRevision {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly version: number,
    public briefJson: unknown,
    public planJson: unknown,
    public artifactsPath: string | null,
    public qaReportJson: unknown | null,
    public createdByAgent: string | null,
    public parentRevisionId: string | null,
    public readonly createdAt: Date
  ) {}

  static create(data: {
    projectId: string;
    version: number;
    briefJson?: unknown;
    planJson?: unknown;
    artifactsPath?: string | null;
    createdByAgent?: string | null;
    parentRevisionId?: string | null;
  }): SiteRevision {
    return new SiteRevision(
      '',
      data.projectId,
      data.version,
      data.briefJson ?? {},
      data.planJson ?? {},
      data.artifactsPath ?? null,
      null,
      data.createdByAgent ?? null,
      data.parentRevisionId ?? null,
      new Date()
    );
  }
}
