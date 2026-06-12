import { getDataAdapter } from '../createDataAdapter';

export const adminRepository = {
  truthStatus: () => getDataAdapter().fetchTruthStatus(),
  explainTimeline: (entityType: string, entityId: string) =>
    getDataAdapter().fetchExplainTimeline(entityType, entityId),
  autonomyTrace: (limit?: number) => getDataAdapter().fetchAutonomyTrace(limit),
  submitTruthReview: () => getDataAdapter().submitTruthReview(),
  suggestions: (route: string, limit: number) => getDataAdapter().fetchSuggestions(route, limit),
  trackUiEvent: (event: { type: string; path: string }) => getDataAdapter().trackUiEvent(event),
};
