import { Plugin } from '../entities/Plugin';

export interface PluginRepository {
  findAll(): Promise<Plugin[]>;
  findById(id: string): Promise<Plugin | null>;
  findByName(name: string): Promise<Plugin | null>;
  save(plugin: Plugin): Promise<Plugin>;
  update(plugin: Plugin): Promise<Plugin>;
  delete(id: string): Promise<void>;
}