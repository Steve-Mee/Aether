import { Plugin } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';
import { PrismaClient } from '@prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaPluginRepository implements PluginRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(tenantId: string): Promise<Plugin[]> {
    const tid = requireTenantId(tenantId, 'PrismaPluginRepository.findAll');
    const rows = await this.prisma.plugin.findMany({ where: { tenantId: tid } });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string, tenantId: string): Promise<Plugin | null> {
    const tid = requireTenantId(tenantId, 'PrismaPluginRepository.findById');
    const row = await this.prisma.plugin.findFirst({ where: { id, tenantId: tid } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string, tenantId: string): Promise<Plugin | null> {
    const tid = requireTenantId(tenantId, 'PrismaPluginRepository.findByName');
    const row = await this.prisma.plugin.findUnique({
      where: { tenantId_name: { tenantId: tid, name } },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(plugin: Plugin, tenantId: string): Promise<Plugin> {
    const tid = requireTenantId(tenantId, 'PrismaPluginRepository.save');
    const created = await this.prisma.plugin.create({
      data: {
        tenantId: tid,
        name: plugin.name,
        version: plugin.version,
        enabled: plugin.status === 'active',
      },
    });
    return this.toDomain(created);
  }

  async update(plugin: Plugin, tenantId: string): Promise<Plugin> {
    const tid = requireTenantId(tenantId, 'PrismaPluginRepository.update');
    const updated = await this.prisma.plugin.update({
      where: { id: plugin.id },
      data: {
        name: plugin.name,
        version: plugin.version,
        enabled: plugin.status === 'active',
      },
    });
    if (updated.tenantId !== tid) throw new Error('Cross-tenant plugin update blocked');
    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaPluginRepository.delete');
    await this.prisma.plugin.deleteMany({ where: { id, tenantId: tid } });
  }

  private toDomain(row: {
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    createdAt: Date;
  }): Plugin {
    return new Plugin(
      row.id,
      row.name,
      row.version,
      '',
      '',
      row.enabled ? 'active' : 'inactive',
      {},
      row.createdAt,
      row.createdAt
    );
  }
}
