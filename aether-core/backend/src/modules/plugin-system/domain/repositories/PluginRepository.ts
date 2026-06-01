import { Plugin } from '../entities/Plugin';

export interface PluginRepository {
  findAll(tenantId: string): Promise<Plugin[]>;
  findById(id: string, tenantId: string): Promise<Plugin | null>;
  findByName(name: string, tenantId: string): Promise<Plugin | null>;
  save(plugin: Plugin, tenantId: string): Promise<Plugin>;
  update(plugin: Plugin, tenantId: string): Promise<Plugin>;
  delete(id: string, tenantId: string): Promise<void>;
}
