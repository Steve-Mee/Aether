import { PrismaClient } from '@prisma/client';
import { Plugin } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';

export class PrismaPluginRepository implements PluginRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Plugin[]> {
    const rows = await this.prisma.plugin.findMany();
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Plugin | null> {
    const row = await this.prisma.plugin.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: string): Promise<Plugin | null> {
    const row = await this.prisma.plugin.findUnique({ where: { name } });
    return row ? this.toDomain(row) : null;
  }

  async save(plugin: Plugin): Promise<Plugin> {
    const created = await this.prisma.plugin.create({
      data: {
        name: plugin.name,
        version: plugin.version,
        enabled: plugin.status === 'active',
      },
    });
    return this.toDomain(created);
  }

  async update(plugin: Plugin): Promise<Plugin> {
    const updated = await this.prisma.plugin.update({
      where: { id: plugin.id },
      data: {
        name: plugin.name,
        version: plugin.version,
        enabled: plugin.status === 'active',
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.plugin.delete({ where: { id } });
  }

  private toDomain(row: { id: string; name: string; version: string; enabled: boolean; createdAt: Date }): Plugin {
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