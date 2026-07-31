import { prisma } from '../../../../shared/prisma/client';
import type { SuggestionDataPort } from '../../application/ports/SuggestionDataPort';

export class PrismaSuggestionDataRepository implements SuggestionDataPort {
  countProducts(tenantId: string) {
    return prisma.product.count({ where: { tenantId } });
  }

  countUnreadEmails(tenantId: string) {
    return prisma.emailMessage.count({
      where: { tenantId, status: { in: ['received', 'escalated'] } },
    });
  }
}
