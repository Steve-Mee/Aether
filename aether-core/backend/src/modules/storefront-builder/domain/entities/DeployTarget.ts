export class DeployTarget {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public provider: string,
    public liveUrl: string | null,
    public configJson: unknown | null,
    public lastDeployedRevisionId: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}
}
