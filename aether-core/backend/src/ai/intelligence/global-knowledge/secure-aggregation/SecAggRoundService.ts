import { prisma } from '../../../../shared/prisma/client';
import { addLaplaceNoise, meetsKAnonymity } from '../federated/privacyUtils';
import { LAPLACE_EPSILON } from '../types';
import {
  computeMaskedValue,
  generateSecretSeed,
  unmaskAggregate,
} from './pairwiseMask';
import type { SecAggEnqueueInput, SecAggPort } from './SecAggPort';

export class SecAggRoundService implements SecAggPort {
  private minParticipants = Number(process.env.SECAGG_MIN_PARTICIPANTS ?? 5);
  private roundTimeoutMs = Number(process.env.SECAGG_ROUND_TIMEOUT_MS ?? 300000);
  private dpEpsilon = Number(process.env.SECAGG_DP_EPSILON ?? 1.0);

  async enqueueMaskedUpdate(input: SecAggEnqueueInput): Promise<boolean> {
    if (process.env.INTELLIGENCE_SECAGG_ENABLED !== 'true') return false;

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: input.tenantId },
      select: { brainFederatedContributionEnabled: true },
    });
    if (!settings?.brainFederatedContributionEnabled) return false;

    const deadline = new Date(Date.now() + this.roundTimeoutMs);
    let round = await prisma.secAggRound.findFirst({
      where: {
        category: input.category,
        metric: input.metric,
        status: 'collecting',
        deadlineAt: { gt: new Date() },
      },
    });

    if (!round) {
      round = await prisma.secAggRound.create({
        data: {
          category: input.category,
          metric: input.metric,
          status: 'collecting',
          minTenants: this.minParticipants,
          deadlineAt: deadline,
          noiseEpsilon: this.dpEpsilon,
        },
      });
    }

    const existing = await prisma.secAggParticipant.findUnique({
      where: { roundId_tenantId: { roundId: round.id, tenantId: input.tenantId } },
    });
    if (existing) {
      await prisma.secAggMaskedUpdate.upsert({
        where: { roundId_tenantId: { roundId: round.id, tenantId: input.tenantId } },
        create: {
          roundId: round.id,
          tenantId: input.tenantId,
          maskedValue: input.value,
          personalMask: 0,
        },
        update: { maskedValue: input.value },
      });
      return true;
    }

    const secretSeed = generateSecretSeed();
    const participants = await prisma.secAggParticipant.findMany({
      where: { roundId: round.id, status: 'active' },
      select: { tenantId: true },
    });
    const tenantIds = [...participants.map((p) => p.tenantId), input.tenantId];
    const { maskedValue, personalMaskValue } = computeMaskedValue(
      round.id,
      input.tenantId,
      input.value,
      secretSeed,
      tenantIds
    );

    await prisma.secAggParticipant.create({
      data: { roundId: round.id, tenantId: input.tenantId, secretSeed },
    });
    await prisma.secAggMaskedUpdate.create({
      data: {
        roundId: round.id,
        tenantId: input.tenantId,
        maskedValue,
        personalMask: personalMaskValue,
      },
    });
    await prisma.secAggRound.update({
      where: { id: round.id },
      data: { participantCount: { increment: 1 } },
    });

    return true;
  }

  async finalizeReadyRounds(): Promise<number> {
    if (process.env.INTELLIGENCE_SECAGG_ENABLED !== 'true') return 0;
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 !== 'true') return 0;

    const rounds = await prisma.secAggRound.findMany({
      where: {
        status: 'collecting',
        OR: [{ deadlineAt: { lte: new Date() } }],
      },
    });

    let upserted = 0;
    for (const round of rounds) {
      const updates = await prisma.secAggMaskedUpdate.findMany({ where: { roundId: round.id } });
      if (!meetsKAnonymity(updates.length, updates.length)) {
        await prisma.secAggRound.update({
          where: { id: round.id },
          data: { status: 'failed' },
        });
        continue;
      }

      const rawAvg =
        unmaskAggregate(
          updates.map((u) => ({
            maskedValue: u.maskedValue,
            personalMask: u.personalMask,
          }))
        ) / updates.length;

      const noisy = addLaplaceNoise(rawAvg, 1, round.noiseEpsilon || this.dpEpsilon);

      await prisma.globalInsight.upsert({
        where: { category_metric: { category: round.category, metric: round.metric } },
        create: {
          category: round.category,
          metric: round.metric,
          value: noisy,
          sampleSize: updates.length,
          tenantCount: updates.length,
          noiseEpsilon: round.noiseEpsilon,
        },
        update: {
          value: noisy,
          sampleSize: updates.length,
          tenantCount: updates.length,
        },
      });

      await prisma.secAggRound.update({
        where: { id: round.id },
        data: { status: 'completed', aggregateValue: noisy },
      });
      upserted++;
    }

    return upserted;
  }
}

export class SecureAggregationService {
  constructor(private rounds: SecAggRoundService = new SecAggRoundService()) {}

  enqueue(input: SecAggEnqueueInput): Promise<boolean> {
    return this.rounds.enqueueMaskedUpdate(input);
  }

  finalize(): Promise<number> {
    return this.rounds.finalizeReadyRounds();
  }
}
