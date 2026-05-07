export class Payment {
  constructor(
    public id: string,
    public orderId: string,
    public amount: number,
    public currency: string = 'EUR',
    public status: 'pending' | 'paid' | 'failed' | 'refunded' = 'pending',
    public paymentMethod: string,
    public transactionId?: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}