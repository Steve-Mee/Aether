import { Request, Response } from 'express';
import { z } from 'zod';
import { SubmitInsightUseCase } from '../../application/use-cases/SubmitInsightUseCase';
import { QueryInsightsUseCase } from '../../application/use-cases/QueryInsightsUseCase';
import { federatedAggregationService, privacyBudgetService } from '../../wiring';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { Insight } from '../../domain/entities/Insight';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';

const insightSchema = z.object({
  merchantId: z.string().min(1),
  category: z.enum(['pricing', 'conversion', 'trend', 'inventory', 'marketing']),
  metric: z.string().min(1),
  value: z.number(),
  sampleSize: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
});

export class HiveMindController {
  private get submitUseCase(): SubmitInsightUseCase {
    return getCompositionRoot().submitInsight;
  }

  private get queryUseCase(): QueryInsightsUseCase {
    return getCompositionRoot().queryInsights;
  }

  submitInsight = [
    requireOperator,
    validateBody(insightSchema),
    async (req: Request, res: Response) => {
      try {
        const payload = req.body as Omit<Insight, 'id' | 'timestamp' | 'zkProof'>;
        const result = await this.submitUseCase.execute(
          { id: '', ...payload, timestamp: new Date() },
          req.tenantId!
        );
        res.status(201).json({ status: 'partial', ...result });
      } catch (error: unknown) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid insight' });
      }
    },
  ];

  getAggregatedInsights = [
    requireViewer,
    async (req: Request, res: Response) => {
      try {
        const { category, metric } = req.query;
        if (category || metric) {
          const result = await this.queryUseCase.execute(
            category as string,
            metric as string,
            req.tenantId!
          );
          res.json({ status: 'partial', ...result });
          return;
        }
        const batch = await federatedAggregationService.getAggregatedInsights(req.tenantId!);
        const budget = await privacyBudgetService.getOrCreate(req.tenantId!);
        res.json({ status: 'partial', ...batch, privacyBudget: budget });
      } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Query failed' });
      }
    },
  ];
}
