import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { writeAuditLog } from '../audit/auditService';

const DEFAULT_TENANT = process.env.AETHER_DEFAULT_TENANT ?? 'tenant_default';

function rejectTenantHeaderMismatch(
  req: Request,
  res: Response,
  resolvedTenantId: string
): boolean {
  const headerTenant = req.header('X-Aether-Tenant-Id');
  if (headerTenant && headerTenant !== resolvedTenantId) {
    void writeAuditLog({
      tenantId: resolvedTenantId,
      module: 'security',
      action: 'tenant_access_denied',
      actor: 'webhook',
      details: {
        reason: 'webhook_tenant_header_mismatch',
        headerTenant,
        resolvedTenantId,
        path: req.path,
      },
    });
    res.status(403).json({ error: 'Webhook tenant header must match resolved tenant' });
    return true;
  }
  return false;
}

export async function resolveSupplierWebhookTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const supplierId = (req.body as { supplierId?: string })?.supplierId;
  let tenantId = process.env.SUPPLIER_WEBHOOK_TENANT ?? DEFAULT_TENANT;

  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      res.status(403).json({ error: 'Unknown supplier for webhook' });
      return;
    }
    tenantId = supplier.tenantId;
  }

  if (rejectTenantHeaderMismatch(req, res, tenantId)) return;

  req.tenantId = tenantId;
  next();
}

export function resolvePaymentWebhookTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = process.env.PAYMENT_WEBHOOK_TENANT ?? DEFAULT_TENANT;
  if (rejectTenantHeaderMismatch(req, res, tenantId)) return;
  req.tenantId = tenantId;
  next();
}

export function resolveStripeWebhookTenant(metadataTenantId: string | undefined): string {
  return metadataTenantId ?? process.env.STRIPE_WEBHOOK_TENANT ?? DEFAULT_TENANT;
}
