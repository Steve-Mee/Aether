export class SitePage {
  constructor(
    public readonly id: string,
    public readonly revisionId: string,
    public path: string,
    public title: string,
    public seoJson: unknown,
    public treeJson: unknown,
    public sortOrder: number,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  static create(data: {
    revisionId: string;
    path: string;
    title: string;
    seoJson?: unknown;
    treeJson?: unknown;
    sortOrder?: number;
  }): SitePage {
    const now = new Date();
    return new SitePage(
      '',
      data.revisionId,
      data.path,
      data.title,
      data.seoJson ?? {},
      data.treeJson ?? {},
      data.sortOrder ?? 0,
      now,
      now
    );
  }
}
