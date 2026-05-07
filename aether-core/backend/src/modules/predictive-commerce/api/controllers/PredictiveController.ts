import { Request, Response } from 'express';
import { DemandForecaster } from '../../application/services/DemandForecaster';
import { ProductGenesisService } from '../../application/services/ProductGenesisService';

export class PredictiveController {
  private forecaster = new DemandForecaster();
  private genesis = new ProductGenesisService();

  async runDemandForecast(req: Request, res: Response) {
    try {
      const { productId, days } = req.body;
      const forecast = await this.forecaster.forecastDemand(productId, days || 30);
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: 'Failed to run forecast' });
    }
  }

  async generateProductIdeas(req: Request, res: Response) {
    try {
      const { limit } = req.body;
      const ideas = await this.genesis.generateProductIdeas(limit || 5);
      res.json(ideas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate product ideas' });
    }
  }

  async getTrendSignals(req: Request, res: Response) {
    res.json({
      message: 'Trend signals endpoint - coming soon with real data sources',
      currentTrends: ['sustainability', 'y2k revival', 'smart accessories']
    });
  }

  async getProductForecast(req: Request, res: Response) {
    const { productId } = req.params;
    const forecast = await this.forecaster.forecastDemand(productId, 30);
    res.json(forecast);
  }
}