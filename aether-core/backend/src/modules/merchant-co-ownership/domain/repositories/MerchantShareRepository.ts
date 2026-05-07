import { MerchantShare } from '../entities/MerchantShare';

export interface MerchantShareRepository {
  findByMerchantId(merchantId: string): Promise<MerchantShare[]>;
  save(share: MerchantShare): Promise<void>;
}