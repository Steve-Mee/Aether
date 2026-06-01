import { Request, Response } from 'express';
import { z } from 'zod';
import { RegisterPluginUseCase } from '../../application/use-cases/RegisterPluginUseCase';
import { PluginRegistry } from '../../application/services/PluginRegistry';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';

const registerSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  author: z.string().min(1),
});

const activateParamsSchema = z.object({
  id: z.string().min(1),
});

export class PluginController {
  constructor(
    private registerPluginUseCase: RegisterPluginUseCase,
    private pluginRegistry: PluginRegistry
  ) {}

  registerPlugin = [
    requireOperator,
    validateBody(registerSchema),
    async (req: Request, res: Response) => {
      try {
        const plugin = await this.registerPluginUseCase.execute(req.body, req.tenantId!);
        res.status(201).json({ ...plugin, status: 'experimental' });
      } catch {
        res.status(500).json({ error: 'Failed to register plugin' });
      }
    },
  ];

  getAllPlugins = [
    requireViewer,
    async (_req: Request, res: Response) => {
      const plugins = this.pluginRegistry.getLoadedPlugins();
      res.json({ status: 'experimental', plugins });
    },
  ];

  activatePlugin = [
    requireOperator,
    async (req: Request, res: Response) => {
      try {
        const parsed = activateParamsSchema.safeParse(req.params);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid plugin id' });
          return;
        }
        await this.pluginRegistry.activatePlugin(parsed.data.id, req.tenantId!);
        res.json({ status: 'experimental', message: 'Plugin activated' });
      } catch {
        res.status(500).json({ error: 'Failed to activate plugin' });
      }
    },
  ];
}
