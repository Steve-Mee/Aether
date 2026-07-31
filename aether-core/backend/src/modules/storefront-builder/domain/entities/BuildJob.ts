export type BuildJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export class BuildJob {
  constructor(
    public readonly id: string,
    public readonly revisionId: string,
    public status: BuildJobStatus | string,
    public logs: string | null,
    public previewUrl: string | null,
    public startedAt: Date | null,
    public finishedAt: Date | null,
    public readonly createdAt: Date
  ) {}

  static createQueued(revisionId: string): BuildJob {
    return new BuildJob('', revisionId, 'queued', null, null, null, null, new Date());
  }
}
