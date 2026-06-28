import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { DemandForecaster } from '../../../../modules/predictive-commerce/application/services/DemandForecaster';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface ForecastToolsDeps {
  adminData: AdminDataPort;
  demandForecaster: DemandForecaster;
}

export function getForecastSummaryTool(deps: ForecastToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getForecastSummary',
      description: 'Get demand forecast overview: stored forecast count and recent entries',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'predictive-commerce',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const [count, forecasts] = await Promise.all([
        deps.adminData.countForecasts(ctx.tenantId),
        deps.adminData.listForecasts(ctx.tenantId, 5),
      ]);
      return {
        success: true,
        forecastCount: count,
        recentForecasts: forecasts,
        message: `${count} forecasts on file`,
      };
    },
  };
}

export function listForecastsTool(deps: ForecastToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listForecasts',
      description: 'List stored demand forecasts for products',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max forecasts (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'predictive-commerce',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const limit = Math.min(Number(input.limit ?? 20), 50);
      const forecasts = await deps.adminData.listForecasts(ctx.tenantId, limit);
      return { success: true, count: forecasts.length, forecasts };
    },
  };
}

export function forecastProductDemandTool(deps: ForecastToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'forecastProductDemand',
      description: 'Generate demand forecast for a product based on order history',
      parameters: {
        productId: { type: 'string', required: true, description: 'Product ID' },
        days: { type: 'number', required: false, description: 'Forecast horizon in days (default 30)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'predictive-commerce',
    },
    validate(input) {
      if (!String(input.productId ?? '').trim()) {
        return { ok: false, error: 'productId is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const productId = String(input.productId);
      const days = Number(input.days ?? 30);
      const forecast = await deps.demandForecaster.forecastDemand(productId, ctx.tenantId, days);
      return { success: true, forecast };
    },
  };
}
