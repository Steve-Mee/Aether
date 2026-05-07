import { Request, Response } from 'express';
import { SubmitInsightUseCase } from '../../application/use-cases/SubmitInsightUseCase';
import { QueryInsightsUseCase } from '../../application/use-cases/QueryInsightsUseCase';
import { PrismaHiveMindRepository } from '../../infrastructure/persistence/PrismaHiveMindRepository';
import { AggregationService } from '../../application/services/AggregationService';

export class HiveMindController {
  private submitUseCase: SubmitInsightUseCase;
  private queryUseCase: QueryInsightsUseCase;

  constructor() {
    const repository = new PrismaHiveMindRepository();
    const aggregationService = new AggregationService();
    
    this.submitUseCase = new SubmitInsightUseCase(repository);
    this.queryUseCase = new QueryInsightsUseCase(repository, aggregationService);
  }

  async submitInsight(req: Request, res: Response) {
    try {
      const result = await this.submitUseCase.execute(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAggregatedInsights(req: Request, res: Response) {
    try {
      const { category, metric } = req.query;
      const result = await this.queryUseCase.execute(category as string, metric as string);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}