/**
 * Tenant context contract — repositories and use cases must receive explicit tenantId.
 * Never infer tenant from defaults in persistence layer.
 */

export class MissingTenantError extends Error {
  constructor(context: string) {
    super(`Missing tenantId in ${context}`);
    this.name = 'MissingTenantError';
  }
}

export function requireTenantId(tenantId: string | undefined | null, context: string): string {
  if (!tenantId || tenantId.trim() === '') {
    throw new MissingTenantError(context);
  }
  return tenantId;
}

/** Forbidden in repository/infrastructure code — use requireTenantId instead. */
export const FORBIDDEN_DEFAULT_TENANT = 'tenant_default';

export function assertNotHardcodedTenant(tenantId: string, context: string): void {
  if (tenantId === FORBIDDEN_DEFAULT_TENANT && process.env.AETHER_ALLOW_DEFAULT_TENANT_IN_REPOS !== 'true') {
    // Allow in tests/seed via env; block in production repository paths when tenant wasn't passed from request
    const stack = new Error().stack ?? '';
    if (stack.includes('infrastructure/persistence') || stack.includes('PrismaInventoryRepository')) {
      throw new Error(
        `Hardcoded tenant '${FORBIDDEN_DEFAULT_TENANT}' forbidden in ${context}. Pass tenantId from request context.`
      );
    }
  }
}
