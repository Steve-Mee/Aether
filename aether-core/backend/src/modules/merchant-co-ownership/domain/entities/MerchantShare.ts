export class MerchantShare {
  constructor(
    public id: string,
    public merchantId: string,
    public amount: number,
    public percentage: number,
    public issuedAt: Date
  ) {}
}