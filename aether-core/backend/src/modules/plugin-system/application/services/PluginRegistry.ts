import { Plugin } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PluginRegistry {
  private loadedPlugins: Map<string, Plugin> = new Map();

  constructor(private pluginRepository: PluginRepository) {}

  async registerPlugin(plugin: Plugin, tenantId: string): Promise<Plugin> {
    const tid = requireTenantId(tenantId, 'PluginRegistry.registerPlugin');
    const saved = await this.pluginRepository.save(plugin, tid);
    this.loadedPlugins.set(saved.id, saved);
    return saved;
  }

  async activatePlugin(id: string, tenantId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PluginRegistry.activatePlugin');
    const plugin = await this.pluginRepository.findById(id, tid);
    if (!plugin) throw new Error('Plugin not found');

    plugin.status = 'active';
    await this.pluginRepository.update(plugin, tid);
  }

  async deactivatePlugin(id: string, tenantId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PluginRegistry.deactivatePlugin');
    const plugin = await this.pluginRepository.findById(id, tid);
    if (!plugin) throw new Error('Plugin not found');

    plugin.status = 'inactive';
    await this.pluginRepository.update(plugin, tid);
  }

  async listPlugins(tenantId: string): Promise<Plugin[]> {
    const tid = requireTenantId(tenantId, 'PluginRegistry.listPlugins');
    return this.pluginRepository.findAll(tid);
  }

  getLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}
