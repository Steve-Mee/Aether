export class RevenueDistribution {
  constructor(
    public id: string,
    public period: string,
    public totalRevenue: number,
    public distributedToOwners: number,
    public distributedAt: Date
  ) {}
}