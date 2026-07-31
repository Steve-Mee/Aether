import { Request, Response } from 'express';
import { z } from 'zod';
import { DemandForecaster } from '../../application/services/DemandForecaster';
import { demandForecastAdapter } from '../../infrastructure/adapters/PrismaDemandForecastAdapter';
import { ProductGenesisService } from '../../application/services/ProductGenesisService';
import { requireOperator } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';

const forecastSchema = z.object({
  productId: z.string().min(1),
  days: z.number().int().positive().optional(),
});

const genesisSchema = z.object({
  limit: z.number().int().positive().max(20).optional(),
});

export class PredictiveController {
  private forecaster = new DemandForecaster(demandForecastAdapter);
  private genesis = new ProductGenesisService();

  runDemandForecast = [
    requireOperator,
    validateBody(forecastSchema),
    async (req: Request, res: Response) => {
      try {
        const { productId, days } = req.body;
        const forecast = await this.forecaster.forecastDemand(productId, req.tenantId!, days || 30);
        res.json({ status: 'experimental', ...forecast });
      } catch {
        res.status(500).json({ error: 'Failed to run forecast' });
      }
    },
  ];

  generateProductIdeas = [
    requireOperator,
    validateBody(genesisSchema),
    async (req: Request, res: Response) => {
      try {
        const { limit } = req.body;
        const ideas = await this.genesis.generateProductIdeas(limit || 5);
        res.json({
          status: 'experimental',
          source: 'fixture',
          message: 'Static sample ideas — not live trend analysis or LLM output',
          ideas,
        });
      } catch {
        res.status(500).json({ error: 'Failed to generate product ideas' });
      }
    },
  ];

  getTrendSignals = [
    requireOperator,
    async (_req: Request, res: Response) => {
      res.json({
        status: 'experimental',
        message: 'Heuristic trend signals — external data sources not connected',
        currentTrends: ['sustainability', 'y2k revival', 'smart accessories'],
      });
    },
  ];

  getProductForecast = [
    requireOperator,
    async (req: Request, res: Response) => {
      const forecast = await this.forecaster.forecastDemand(req.params.productId, req.tenantId!, 30);
      res.json({ status: 'experimental', ...forecast });
    },
  ];
}
