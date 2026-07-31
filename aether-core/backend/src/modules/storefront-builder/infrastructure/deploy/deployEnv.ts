/**
 * Returns true only when STOREFRONT_DEPLOY_ENABLED=true.
 * Default/false → staged local deploy (CI-friendly); DB live update still happens in approval handler.
 */
export function isStorefrontDeployEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.STOREFRONT_DEPLOY_ENABLED === 'true';
}
