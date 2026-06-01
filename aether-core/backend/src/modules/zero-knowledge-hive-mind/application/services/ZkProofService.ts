import crypto from 'crypto';

export interface ZkCommitmentInput {
  merchantId: string;
  category: string;
  metric: string;
  value: number;
  sampleSize: number;
  timestamp: Date;
}

/** Pedersen-style commitment hash — partial ZK privacy layer (not full ZK-SNARK). */
export function createInsightCommitment(input: ZkCommitmentInput): string {
  const salt = process.env.HIVE_MIND_SALT ?? 'aether-dev-salt';
  const payload = [
    input.merchantId,
    input.category,
    input.metric,
    input.value.toFixed(4),
    String(input.sampleSize),
    input.timestamp.toISOString(),
  ].join('|');

  return crypto.createHmac('sha256', salt).update(payload).digest('hex');
}

export function verifyInsightCommitment(proof: string, input: ZkCommitmentInput): boolean {
  const expected = createInsightCommitment(input);
  if (proof.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(proof), Buffer.from(expected));
}
