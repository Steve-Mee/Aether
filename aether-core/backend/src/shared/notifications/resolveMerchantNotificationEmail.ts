import { prisma } from '../prisma/client';

export async function resolveMerchantNotificationEmail(tenantId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { tenantId, role: { in: ['operator', 'admin', 'owner'] } },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  });
  return user?.email ?? null;
}
