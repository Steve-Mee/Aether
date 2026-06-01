import { Plugin } from '../../domain/entities/Plugin';
import { PluginRepository } from '../../domain/repositories/PluginRepository';
import { PluginRegistry } from '../services/PluginRegistry';

export class RegisterPluginUseCase {
  constructor(
    private pluginRepository: PluginRepository,
    private pluginRegistry: PluginRegistry
  ) {}

  async execute(
    pluginData: {
      name: string;
      version: string;
      description: string;
      author: string;
    },
    tenantId: string
  ): Promise<Plugin> {
    const plugin = new Plugin(
      crypto.randomUUID(),
      pluginData.name,
      pluginData.version,
      pluginData.description,
      pluginData.author
    );

    return await this.pluginRegistry.registerPlugin(plugin, tenantId);
  }
}