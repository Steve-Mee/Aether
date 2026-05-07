import { Request, Response } from 'express';
import { RegisterPluginUseCase } from '../../application/use-cases/RegisterPluginUseCase';
import { PluginRegistry } from '../../application/services/PluginRegistry';

export class PluginController {
  constructor(
    private registerPluginUseCase: RegisterPluginUseCase,
    private pluginRegistry: PluginRegistry
  ) {}

  async registerPlugin(req: Request, res: Response) {
    try {
      const { name, version, description, author } = req.body;
      
      if (!name || !version || !description || !author) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const plugin = await this.registerPluginUseCase.execute({
        name,
        version,
        description,
        author
      });

      res.status(201).json(plugin);
    } catch (error) {
      res.status(500).json({ error: 'Failed to register plugin' });
    }
  }

  async getAllPlugins(req: Request, res: Response) {
    const plugins = this.pluginRegistry.getLoadedPlugins();
    res.json(plugins);
  }

  async activatePlugin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.pluginRegistry.activatePlugin(id);
      res.json({ message: 'Plugin activated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to activate plugin' });
    }
  }
}