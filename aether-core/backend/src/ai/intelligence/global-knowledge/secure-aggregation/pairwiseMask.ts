import crypto from 'crypto';

/** Deterministic pairwise mask for scalar SecAgg (Bonawitz-style simplified). */
export function pairwiseMask(roundId: string, tenantA: string, tenantB: string): number {
  if (tenantA === tenantB) return 0;
  const [first, second] = tenantA < tenantB ? [tenantA, tenantB] : [tenantB, tenantA];
  const sign = tenantA < tenantB ? 1 : -1;
  const hmac = crypto
    .createHmac('sha256', roundId)
    .update(`${first}:${second}`)
    .digest();
  const raw = hmac.readInt32BE(0);
  return sign * (raw / 2 ** 31);
}

export function personalMask(roundId: string, tenantId: string, secretSeed: string): number {
  const hmac = crypto
    .createHmac('sha256', secretSeed)
    .update(`${roundId}:${tenantId}`)
    .digest();
  return hmac.readInt32BE(0) / 2 ** 31;
}

export function generateSecretSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function computeMaskedValue(
  roundId: string,
  tenantId: string,
  value: number,
  secretSeed: string,
  otherTenants: string[]
): { maskedValue: number; personalMaskValue: number } {
  const pMask = personalMask(roundId, tenantId, secretSeed);
  let pairSum = 0;
  for (const other of otherTenants) {
    if (other !== tenantId) pairSum += pairwiseMask(roundId, tenantId, other);
  }
  return {
    personalMaskValue: pMask,
    maskedValue: value + pMask + pairSum,
  };
}

export function unmaskAggregate(
  updates: Array<{ maskedValue: number; personalMask: number }>
): number {
  const sumMasked = updates.reduce((a, u) => a + u.maskedValue, 0);
  const sumPersonal = updates.reduce((a, u) => a + u.personalMask, 0);
  return sumMasked - sumPersonal;
}
