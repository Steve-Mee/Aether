import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../shared/prisma/client';
import { requireTenantId } from '../../../shared/tenant/tenantContext';
import type { LoRAAdapterPort, LoRAContext } from './LoRAAdapterPort';
import type { LoRAAdapterRecord, LoRAAdapterRegistryPort } from './LoRAAdapterRegistryPort';

interface LoRAManifest {
  adapterId: string;
  version: string;
  traits?: string[];
}

export class FilesystemLoRAAdapter implements LoRAAdapterRegistryPort {
  async loadContext(tenantId: string): Promise<LoRAContext> {
    const tid = requireTenantId(tenantId, 'FilesystemLoRAAdapter.loadContext');
    const row = await prisma.brainLoRAAdapter.findFirst({
      where: { tenantId: tid, enabled: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!row) {
      return {
        adapterId: `lora-${tid.slice(0, 8)}`,
        version: '0.0.0',
        traits: [],
      };
    }

    try {
      const manifestPath = path.join(row.storagePath, 'manifest.json');
      const raw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(raw) as LoRAManifest;
      return {
        adapterId: manifest.adapterId ?? row.adapterId,
        version: manifest.version ?? row.version,
        traits: manifest.traits ?? (row.traits as string[]) ?? [],
      };
    } catch {
      return {
        adapterId: row.adapterId,
        version: row.version,
        traits: (row.traits as string[]) ?? [],
      };
    }
  }

  async register(tenantId: string, record: LoRAAdapterRecord): Promise<void> {
    const tid = requireTenantId(tenantId, 'FilesystemLoRAAdapter.register');
    await prisma.brainLoRAAdapter.upsert({
      where: { tenantId_adapterId: { tenantId: tid, adapterId: record.adapterId } },
      create: {
        tenantId: tid,
        adapterId: record.adapterId,
        version: record.version,
        storagePath: record.storagePath,
        traits: record.traits,
        enabled: record.enabled,
      },
      update: {
        version: record.version,
        storagePath: record.storagePath,
        traits: record.traits,
        enabled: record.enabled,
      },
    });
  }

  async list(tenantId: string): Promise<LoRAAdapterRecord[]> {
    const tid = requireTenantId(tenantId, 'FilesystemLoRAAdapter.list');
    const rows = await prisma.brainLoRAAdapter.findMany({ where: { tenantId: tid } });
    return rows.map((r) => ({
      adapterId: r.adapterId,
      version: r.version,
      storagePath: r.storagePath,
      traits: (r.traits as string[]) ?? [],
      enabled: r.enabled,
    }));
  }
}
