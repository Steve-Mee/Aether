import { PrismaClient } from '@prisma/client';
import { Plugin } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';

export class PrismaPluginRepository implements PluginRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<Plugin[]> {
    const records = await this.prisma.plugin.findMany();
    return records.map(this.mapToEntity);
  }

  async findById(id: string): Promise<Plugin | null> {
    const record = await this.prisma.plugin.findUnique({ where: { id } });
    return record ? this.mapToEntity(record) : null;
  }

  async findByName(name: string): Promise<Plugin | null> {
    const record = await this.prisma.plugin.findFirst({ where: { name } });
    return record ? this.mapToEntity(record) : null;
  }

  async save(plugin: Plugin): Promise<Plugin> {
    const record = await this.prisma.plugin.create({
      data: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        status: plugin.status,
        config: plugin.config,
      }
    });
    return this.mapToEntity(record);
  }

  async update(plugin: Plugin): Promise<Plugin> {
    const record = await this.prisma.plugin.update({
      where: { id: plugin.id },
      data: {
        status: plugin.status,
        config: plugin.config,
        updatedAt: new Date()
      }
    });
    return this.mapToEntity(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.plugin.delete({ where: { id } });
  }

  private mapToEntity(record: any): Plugin {
    return new Plugin(
      record.id,
      record.name,
      record.version,
      record.description,
      record.author,
      record.status,
      record.config,
      record.createdAt,
      record.updatedAt
    );
  }
}