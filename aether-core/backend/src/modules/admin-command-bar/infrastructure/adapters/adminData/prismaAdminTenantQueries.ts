import { prisma } from '../../../../../shared/prisma/client';
import { requireTenantId } from '../../../../../shared/tenant/tenantContext';

export async function getTenantDisplayName(tenantId: string): Promise<string | undefined> {
  const tid = requireTenantId(tenantId, 'AdminData.getTenantDisplayName');
  const tenant = await prisma.tenant.findUnique({
    where: { id: tid },
    select: { name: true },
  });
  return tenant?.name ?? undefined;
}

export async function upsertPushSubscription(input: {
  tenantId: string;
  actorId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  const tid = requireTenantId(input.tenantId, 'AdminData.upsertPushSubscription');
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      tenantId: tid,
      actorId: input.actorId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent,
    },
    create: {
      tenantId: tid,
      actorId: input.actorId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent,
    },
  });
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
