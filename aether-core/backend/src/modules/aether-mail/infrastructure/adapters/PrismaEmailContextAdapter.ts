import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { EmailContextPort, EmailContextData } from '../../application/ports/EmailContextPort';

export class PrismaEmailContextAdapter implements EmailContextPort {
  async loadContext(fromEmail: string, tenantId: string): Promise<EmailContextData> {
    const tid = requireTenantId(tenantId, 'EmailContext.load');
    try {
      const customer = await prisma.customer.findFirst({
        where: { tenantId: tid, email: fromEmail },
      });
      const priorEmailCount = await prisma.emailMessage.count({
        where: { tenantId: tid, from: fromEmail },
      });
      if (!customer) {
        return {
          customerEmail: fromEmail,
          customerName: null,
          recentOrderCount: 0,
          recentOrderTotal: 0,
          priorEmailCount,
          source: 'fallback',
        };
      }
      const orders = await prisma.order.findMany({
        where: { tenantId: tid, customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      return {
        customerEmail: fromEmail,
        customerName: [customer.firstName, customer.lastName].filter(Boolean).join(' ') || null,
        recentOrderCount: orders.length,
        recentOrderTotal: orders.reduce((sum, o) => sum + o.total, 0),
        priorEmailCount,
        source: 'database',
      };
    } catch {
      return {
        customerEmail: fromEmail,
        customerName: null,
        recentOrderCount: 0,
        recentOrderTotal: 0,
        priorEmailCount: 0,
        source: 'fallback',
      };
    }
  }
}

export const emailContextAdapter = new PrismaEmailContextAdapter();
