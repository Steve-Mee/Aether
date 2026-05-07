import { Plugin } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';

export class PluginRegistry {
  private loadedPlugins: Map<string, any> = new Map();

  constructor(private pluginRepository: PluginRepository) {}

  async registerPlugin(plugin: Plugin): Promise<Plugin> {
    // TODO: Load and validate plugin code
    console.log(`[PluginRegistry] Registering plugin: ${plugin.name} v${plugin.version}`);
    
    const saved = await this.pluginRepository.save(plugin);
    this.loadedPlugins.set(saved.id, saved);
    
    return saved;
  }

  async activatePlugin(id: string): Promise<void> {
    const plugin = await this.pluginRepository.findById(id);
    if (!plugin) throw new Error('Plugin not found');

    plugin.status = 'active';
    await this.pluginRepository.update(plugin);
    
    console.log(`[PluginRegistry] Activated plugin: ${plugin.name}`);
  }

  async deactivatePlugin(id: string): Promise<void> {
    const plugin = await this.pluginRepository.findById(id);
    if (!plugin) throw new Error('Plugin not found');

    plugin.status = 'inactive';
    await this.pluginRepository.update(plugin);
  }

  getLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}