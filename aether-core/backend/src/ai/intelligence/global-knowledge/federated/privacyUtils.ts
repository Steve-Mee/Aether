export function addLaplaceNoise(value: number, sensitivity: number, epsilon: number): number {
  if (epsilon <= 0) return value;
  const scale = sensitivity / epsilon;
  const u = Math.random() - 0.5;
  const sign = u < 0 ? -1 : 1;
  const noise = -scale * sign * Math.log(1 - 2 * Math.abs(u));
  return value + noise;
}

export function meetsKAnonymity(tenantCount: number, sampleSize: number): boolean {
  const minTenants = Number(process.env.FEDERATED_MIN_TENANTS ?? 5);
  const minSamples = Number(process.env.FEDERATED_MIN_SAMPLES ?? 10);
  return tenantCount >= minTenants && sampleSize >= minSamples;
}
