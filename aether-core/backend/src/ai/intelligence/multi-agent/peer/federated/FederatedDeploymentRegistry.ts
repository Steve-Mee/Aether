import crypto from 'crypto';
import { prisma } from '../../../../../shared/prisma/client';
import type { FederatedDeploymentEntry } from './types';

export interface FederatedDeploymentEntryWithSource extends FederatedDeploymentEntry {
  source: 'env' | 'db';
}

function parseJsonDeployments(): FederatedDeploymentEntry[] {
  const raw = process.env.FEDERATED_DEPLOYMENTS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FederatedDeploymentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function envDeploymentIds(): Set<string> {
  return new Set(parseJsonDeployments().map((d) => d.deploymentId));
}

export class FederatedDeploymentRegistry {
  async listActive(): Promise<FederatedDeploymentEntry[]> {
    const all = await this.listAll();
    return all.filter((d) => d.status === 'active');
  }

  async listAll(): Promise<FederatedDeploymentEntryWithSource[]> {
    const fromDb = await prisma.federatedDeploymentRegistry.findMany({
      orderBy: { deploymentId: 'asc' },
    });
    const envIds = envDeploymentIds();
    const dbEntries: FederatedDeploymentEntryWithSource[] = fromDb.map((row) => ({
      deploymentId: row.deploymentId,
      baseUrl: row.baseUrl ?? undefined,
      publicKey: row.publicKey ?? undefined,
      capabilities: Array.isArray(row.capabilities) ? (row.capabilities as string[]) : [],
      status: row.status === 'inactive' ? 'inactive' : 'active',
      source: envIds.has(row.deploymentId) ? 'env' : 'db',
    }));

    const envEntries: FederatedDeploymentEntryWithSource[] = parseJsonDeployments().map((entry) => ({
      ...entry,
      source: 'env' as const,
    }));

    const byId = new Map<string, FederatedDeploymentEntryWithSource>();
    for (const entry of [...envEntries, ...dbEntries]) {
      byId.set(entry.deploymentId, entry);
    }
    return [...byId.values()];
  }

  async getByDeploymentId(deploymentId: string): Promise<FederatedDeploymentEntryWithSource | null> {
    const all = await this.listAll();
    return all.find((d) => d.deploymentId === deploymentId) ?? null;
  }

  async findForCapability(capability: string): Promise<FederatedDeploymentEntry | null> {
    const deployments = await this.listActive();
    return (
      deployments.find(
        (d) => d.capabilities.includes(capability) || d.capabilities.includes('*')
      ) ?? null
    );
  }

  async upsert(entry: FederatedDeploymentEntry): Promise<void> {
    if (envDeploymentIds().has(entry.deploymentId)) {
      throw new Error('Cannot upsert env-sourced deployment');
    }
    await prisma.federatedDeploymentRegistry.upsert({
      where: { deploymentId: entry.deploymentId },
      create: {
        deploymentId: entry.deploymentId,
        baseUrl: entry.baseUrl ?? null,
        publicKey: entry.publicKey ?? null,
        capabilities: entry.capabilities,
        status: entry.status,
      },
      update: {
        baseUrl: entry.baseUrl ?? null,
        publicKey: entry.publicKey ?? null,
        capabilities: entry.capabilities,
        status: entry.status,
      },
    });
  }

  async deactivate(deploymentId: string): Promise<void> {
    if (envDeploymentIds().has(deploymentId)) {
      throw new Error('Cannot deactivate env-sourced deployment');
    }
    await prisma.federatedDeploymentRegistry.update({
      where: { deploymentId },
      data: { status: 'inactive' },
    });
  }
}

export function hashQueryHint(hint?: string): string | undefined {
  if (!hint) return undefined;
  return crypto.createHash('sha256').update(hint).digest('hex');
}

export function signFederatedPayload(payload: Record<string, unknown>, secret: string): string {
  const body = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyFederatedSignature(
  payload: Record<string, unknown>,
  signature: string,
  secret: string
): boolean {
  const expected = signFederatedPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
