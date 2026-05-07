import { MerchantShare } from '../../domain/entities/MerchantShare';
import { MerchantShareRepository } from '../../domain/repositories/MerchantShareRepository';

export class IssueMerchantShareUseCase {
  constructor(private repository: MerchantShareRepository) {}

  async execute(merchantId: string, amount: number, percentage: number): Promise<MerchantShare> {
    const share = new MerchantShare(
      'share_' + Date.now(),
      merchantId,
      amount,
      percentage,
      new Date()
    );
    await this.repository.save(share);
    return share;
  }
}